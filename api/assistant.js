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
const DEFAULT_MODEL = "qwen/qwen3.6-27b";

const BLOCKED_REPLY = {
  ar: "عذراً، لا يمكنني معالجة هذا الطلب. يسعدني مساعدتك في أي سؤال عن عنبر الحوت أو في إتمام طلبك.",
  en: "Sorry, I can't process that request. I'm happy to help with any question about ambergris or with completing your order.",
};

const ERROR_REPLY = {
  ar: "عذراً، حدث خطأ مؤقت. يمكنك إتمام طلبك عبر زر «اطلب الآن».",
  en: "Sorry, something went wrong. You can complete your order with the “Order now” button.",
};

const systemPrompt = (lang) => {
  const langLine = lang === "en" ? "Reply in English." : "أجب باللغة العربية دائماً.";
  return `You are the ordering assistant for MWOA, a Moroccan seller of "3anber 7out" (عنبر الحوت / ambergris) — a rare natural aromatic material used in fine perfumery. ${langLine}

Facts you may use:
- One product only: natural ambergris, sold by the gram, weighed by hand.
- Each piece is unique in colour, texture, shape and aroma; formed at sea, collected on the Atlantic coast.
- Every order is weighed on a calibrated scale, filmed while packed, sent sealed with a signed note (weight, date, origin).
- Do NOT state or invent a price. If asked about price, say it is confirmed directly when the order is placed.

AVAILABLE COUNTRIES (FOR RESIDENCE & DELIVERY):
We serve Morocco and Asian Arab countries only. Whenever asking for country of residence or delivery, ALWAYS present this list clearly for the customer to choose:
- 🇲🇦 المغرب (Morocco) (+212)
- 🇸🇦 السعودية (Saudi Arabia) (+966)
- 🇦🇪 الإمارات (United Arab Emirates) (+971)
- 🇶🇦 قطر (Qatar) (+974)
- 🇰🇼 الكويت (Kuwait) (+965)
- 🇴🇲 عُمان (Oman) (+968)
- 🇧🇭 البحرين (Bahrain) (+973)
- 🇯🇴 الأردن (Jordan) (+962)
- 🇱🇧 لبنان (Lebanon) (+961)
- 🇮🇶 العراق (Iraq) (+964)
- 🇾🇪 اليمن (Yemen) (+967)
- 🇵🇸 فلسطين (Palestine) (+970)
- 🇸🇾 سوريا (Syria) (+963)

Your job: answer briefly and warmly, then help the customer place an order. Collect these six fields, one or two at a time, not all at once:
1) Full Name
2) Quantity in grams
3) Country of Residence (MUST present the country list above)
4) Country of Delivery (MUST present the country list above)
5) Phone number (if the customer does not type a country code, automatically append the country code of their residence country e.g. +212 for Morocco, +966 for Saudi Arabia, etc.)
6) Email

When you have all six fields, read them back clearly for confirmation (showing the phone number with international country code). After the customer confirms, call the submit_order tool. After it succeeds, thank them and tell them the order was received and they'll be contacted shortly. Keep replies short (2-4 sentences).`;
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
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
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
            output = JSON.stringify({ received: true, delivered: r.delivered, configured: r.configured });
          }
          messages.push({ role: "tool", tool_call_id: tc.id, content: output });
        }
        continue; // let the model produce its confirmation reply
      }

      const cleanReply = (msg.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      return res.status(200).json({ reply: cleanReply, done: ordered });
    }
    return res.status(200).json({ reply: "", done: ordered });
  } catch (err) {
    console.error("assistant error:", err?.status, err?.message);
    const reason =
      err?.status === 401 ? "invalid_api_key" : err?.status === 429 ? "rate_limited" : "assistant_error";
    return res.status(200).json({ reply: ERROR_REPLY[lang], error: reason });
  }
}
