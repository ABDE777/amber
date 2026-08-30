import Anthropic from "@anthropic-ai/sdk";
import { notifyAdmin } from "../lib/notify.js";
import { isPromptAttack } from "../lib/guard.js";

const BLOCKED_REPLY = {
  ar: "عذراً، لا يمكنني معالجة هذا الطلب. يسعدني مساعدتك في أي سؤال عن عنبر الحوت أو في إتمام طلبك.",
  en: "Sorry, I can't process that request. I'm happy to help with any question about ambergris or with completing your order.",
};

const ERROR_REPLY = {
  ar: "عذراً، حدث خطأ مؤقت. يمكنك إتمام طلبك عبر زر «اطلب الآن».",
  en: "Sorry, something went wrong. You can complete your order with the “Order now” button.",
};

// POST /api/assistant  { messages: [{role, content}], lang }
// A guided order assistant. Chats with the customer, and once it has collected
// the full name, quantity (grams), email and phone, it calls the submit_order
// tool which sends the order to the admin (WhatsApp + email).
// Returns 503 when ANTHROPIC_API_KEY is not configured so the UI can hide the
// assistant and fall back to the order form.

const systemPrompt = (lang) => {
  const langLine =
    lang === "en"
      ? "Reply in English."
      : "أجب باللغة العربية دائماً.";
  return `You are the ordering assistant for MWOA, a Moroccan seller of "3anber 7out" (عنبر الحوت / ambergris) — a rare natural aromatic material used in fine perfumery. ${langLine}

Facts you may use:
- One product only: natural ambergris, sold by the gram, weighed by hand.
- Each piece is unique in colour, texture, shape and aroma; formed at sea, collected on the Atlantic coast.
- Every order is weighed on a calibrated scale, filmed while packed, sent sealed with a signed note (weight, date, origin). Delivery across Morocco.
- Do NOT state or invent a price. If asked about price, say it is confirmed directly when the order is placed.

Your job: answer briefly and warmly, then help the customer place an order. Collect these four fields, one or two at a time, not all at once:
1) full name  2) quantity in grams  3) email  4) phone number.
When you have all four, read them back for confirmation. After the customer confirms, call the submit_order tool. After it succeeds, thank them and tell them the order was received and they'll be contacted shortly. Keep replies short (2-4 sentences).`;
};

const tools = [
  {
    name: "submit_order",
    description:
      "Place the customer's ambergris order. Call ONLY after collecting and confirming all four fields with the customer.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer full name" },
        qty: { type: "number", description: "Quantity in grams" },
        email: { type: "string", description: "Customer email" },
        phone: { type: "string", description: "Customer phone number" },
      },
      required: ["name", "qty", "email", "phone"],
      additionalProperties: false,
    },
  },
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "not_configured" });
  }

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

  // Normalise to the Messages API shape; keep only role + string content.
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "expected_user_message" });
  }

  // Prompt Guard 2 (Groq) screens the latest customer message for prompt
  // injection / jailbreak before it reaches Claude. Fails open if unconfigured.
  const lastUser = messages[messages.length - 1].content;
  try {
    const guard = await isPromptAttack(lastUser);
    if (guard.attack) {
      return res.status(200).json({ reply: BLOCKED_REPLY[lang], done: false, blocked: true });
    }
  } catch {
    /* fail open */
  }

  // Trim in case the key was pasted with a trailing space/newline (a common
  // cause of 401s from the provider).
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
  let ordered = false;

  try {
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 1024,
        output_config: { effort: "low" },
        system: systemPrompt(lang),
        tools,
        messages,
      });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      if (response.stop_reason === "tool_use" && toolUses.length) {
        messages.push({ role: "assistant", content: response.content });
        const results = [];
        for (const tu of toolUses) {
          let output = "OK";
          if (tu.name === "submit_order") {
            const inp = tu.input || {};
            const r = await notifyAdmin(
              { name: inp.name, qty: inp.qty, email: inp.email, phone: inp.phone },
              lang
            );
            ordered = true;
            output = JSON.stringify({ received: true, delivered: r.delivered, configured: r.configured });
          }
          results.push({ type: "tool_result", tool_use_id: tu.id, content: output });
        }
        messages.push({ role: "user", content: results });
        continue; // let the model produce its confirmation reply
      }

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return res.status(200).json({ reply: text, done: ordered });
    }
    return res.status(200).json({ reply: "", done: ordered });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status || 500 : 500;
    // Surfaced in the Vercel function logs to make misconfig easy to diagnose.
    console.error("assistant error:", status, err?.message);
    const reason =
      status === 401
        ? "invalid_api_key"
        : status === 429
        ? "rate_limited"
        : "assistant_error";
    return res.status(200).json({ reply: ERROR_REPLY[lang], error: reason });
  }
}
