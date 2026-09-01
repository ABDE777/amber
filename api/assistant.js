  import { notifyAdmin } from "../lib/notify.js";
import { isPromptAttack } from "../lib/guard.js";

// POST /api/assistant  { messages: [{role, content}], lang }
// A guided order assistant running on Groq (OpenAI-compatible API). Chats with
// the customer, and once it has collected the full name, quantity (grams),
// email and phone, it calls the submit_order tool which sends the order to the
// admin (WhatsApp + email). Returns 503 when GROQ_API_KEY is not configured so
// the UI can hide the assistant and fall back to the order form.
//
// Env: GROQ_API_KEY (required), GROQ_ASSISTANT_MODEL (optional, default below).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

const BLOCKED_REPLY = {
  ar: "عذراً، لا يمكنني معالجة هذا الطلب. يسعدني مساعدتك في أي سؤال عن عنبر الحوت أو في إتمام طلبك.",
  en: "Sorry, I can't process that request. I'm happy to help with any question about ambergris or with completing your order.",
};

const ERROR_REPLY = {
  ar: "عذراً، حدث خطأ مؤقت. يمكنك إتمام طلبك عبر زر «اطلب الآن».",
  en: "Sorry, something went wrong. You can complete your order with the “Order now” button.",
};

const systemPrompt = (lang) => {
  const langLine = lang === "en" ? "Reply in English only." : "أجب باللغة العربية فقط، بأسلوب مهذب ومختصر.";
  return `You are the ordering assistant for Moroccan World of Amber (MWOA). ${langLine}

Product: natural raw ambergris (عنبر الحوت), sold by the gram. Do NOT state prices.

You MUST collect ALL 6 of these fields before calling submit_order. Track what you have collected:
  [1] Full Name
  [2] Quantity in grams (a positive number)
  [3] Country of Residence
  [4] Country of Delivery
  [5] Phone number (with country dial code, e.g. +212...)
  [6] Email address (must contain @)

STRICT RULES:
- NEVER call submit_order unless ALL 6 fields have been explicitly provided by the user in this conversation.
- If phone or email is missing, you MUST ask for them before submitting.
- Ask for fields ONE or TWO at a time. After getting name and quantity, ask for Country of Residence next.
- When the user provides a country name (المغرب, Morocco, Qatar, قطر, etc.) accept it immediately as the answer.
- When asking for Country of Residence OR Country of Delivery, append '[ASK_COUNTRY]' at the very end of your reply.
- Do NOT list countries in text. The UI has a dropdown.
- Keep replies to 1-2 sentences.
- After getting country of delivery, ask for Phone AND Email together.
- After getting all 6, show a numbered summary and ask for confirmation.
- Only after confirmation call submit_order with all 6 fields filled.`;
};

// OpenAI-style tool definition (Groq is OpenAI-compatible).
const tools = [
  {
    type: "function",
    function: {
      name: "submit_order",
      description:
        "Place the customer's ambergris order. Call ONLY after collecting and confirming all six fields with the customer.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Customer full name" },
          qty: { type: "number", description: "Quantity in grams" },
          email: { type: "string", description: "Customer email" },
          phone: { type: "string", description: "Customer phone number (with country code)" },
          country_residence: { type: "string", description: "Country where the customer currently resides" },
          country_delivery: { type: "string", description: "Country where the order should be delivered" },
        },
        required: ["name", "qty", "email", "phone", "country_residence", "country_delivery"],
      },
    },
  },
];

async function groqChat(apiKey, model, messages) {
  const body = {
    model,
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.3,
    max_tokens: 512,
  };
  // Disable thinking/reasoning mode for qwen models (causes verbose output that breaks flow)
  if (model.startsWith("qwen")) {
    body.thinking = { type: "disabled" };
  }
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("[Groq Error]", res.status, errBody?.error?.message);
    const err = new Error(`groq ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(503).json({ error: "not_configured" });
  }
  const model = process.env.GROQ_ASSISTANT_MODEL || DEFAULT_MODEL;

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const lang = body?.lang === "en" ? "en" : "ar";
  const incoming = Array.isArray(body?.messages) ? body.messages : [];

  const convo = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));
  if (!convo.length || convo[convo.length - 1].role !== "user") {
    return res.status(400).json({ error: "expected_user_message" });
  }

  // Prompt Guard 2 (also Groq) screens the latest message before the LLM.
  try {
    const guard = await isPromptAttack(convo[convo.length - 1].content);
    if (guard.attack) {
      return res.status(200).json({ reply: BLOCKED_REPLY[lang], done: false, blocked: true });
    }
  } catch {
    /* fail open */
  }

  const messages = [{ role: "system", content: systemPrompt(lang) }, ...convo];
  let ordered = false;
  let lastOrderId = "";

  try {
    for (let i = 0; i < 5; i++) {
      const data = await groqChat(apiKey, model, messages);
      const msg = data?.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls || [];
      if (toolCalls.length) {
        // Echo the assistant turn (with tool_calls) then each tool result.
        messages.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
        for (const tc of toolCalls) {
          let output = "OK";
          if (tc.function?.name === "submit_order") {
            let args = {};
            try {
              args = JSON.parse(tc.function.arguments || "{}");
            } catch {
              args = {};
            }

            // Server-side validation: reject if any required field is empty
            const missing = [];
            if (!args.name || String(args.name).trim().length < 2) missing.push("name");
            if (!args.qty || Number(args.qty) <= 0) missing.push("qty");
            if (!args.email || !String(args.email).includes("@")) missing.push("email");
            if (!args.phone || String(args.phone).replace(/[^0-9]/g, "").length < 7) missing.push("phone");
            if (!args.country_residence || String(args.country_residence).trim().length < 2) missing.push("country_residence");
            if (!args.country_delivery || String(args.country_delivery).trim().length < 2) missing.push("country_delivery");

            if (missing.length > 0) {
              console.warn("[Assistant] submit_order called with missing fields:", missing);
              output = JSON.stringify({
                error: "incomplete_order",
                missing,
                message: `Cannot submit order. The following fields are still missing: ${missing.join(", ")}. Please ask the customer for these fields first.`
              });
            } else {
              const r = await notifyAdmin(
                {
                  name: args.name,
                  qty: args.qty,
                  email: args.email,
                  phone: args.phone,
                  country_residence: args.country_residence,
                  country_delivery: args.country_delivery,
                },
                lang
              );
              ordered = true;
              lastOrderId = r.orderId;
              output = JSON.stringify({ received: true, order_id: r.orderId, delivered: r.delivered, configured: r.configured });
            }
          }
          messages.push({ role: "tool", tool_call_id: tc.id, content: output });
        }
        continue; // let the model produce its confirmation reply
      }

      let cleanReply = (msg.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      let askCountry = cleanReply.includes("[ASK_COUNTRY]");
      cleanReply = cleanReply.replace(/\[ASK_COUNTRY\]/gi, "").trim();

      // Robust fallback check: only if asking for country directly AND NOT summary/phone/email/confirmation
      if (!askCountry) {
        const isSummaryOrConfirmation = /هل هذه البيانات|مراجعة البيانات|تأكيد قبل|البريد الإلكتروني:|رقم الهاتف:|correct\?|confirm/i.test(cleanReply);
        if (!isSummaryOrConfirmation) {
          askCountry = /بلد إقامتك|بلد التسليم|بلد التوصيل|بلد الإقامة|country of residence|country of delivery/i.test(cleanReply);
        }
      }

      return res.status(200).json({ reply: cleanReply, done: ordered, order_id: lastOrderId, ask_country: askCountry });
    }
    return res.status(200).json({ reply: "", done: ordered, order_id: lastOrderId, ask_country: false });
  } catch (err) {
    console.error("assistant error:", err?.status, err?.message);
    const reason =
      err?.status === 401 ? "invalid_api_key" : err?.status === 429 ? "rate_limited" : "assistant_error";
    return res.status(200).json({ reply: ERROR_REPLY[lang], error: reason });
  }
}
