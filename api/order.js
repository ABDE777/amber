import { notifyAdmin, validateOrder } from "../lib/notify.js";

// POST /api/order  { name, qty, email, phone, lang }
// Sends the order to the admin over WhatsApp AND email (whichever are
// configured via env vars). One call, no channel choice for the customer.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { ok, errors, order } = validateOrder(body || {});
  if (!ok) return res.status(400).json({ ok: false, error: "invalid", errors });

  const lang = body.lang === "en" ? "en" : "ar";
  const result = await notifyAdmin(order, lang);

  // configured=false means no channel env vars are set yet: tell the client so
  // it can fall back to a WhatsApp deep link.
  return res.status(200).json({
    ok: result.delivered,
    configured: result.configured,
    channels: result.channels,
  });
}
