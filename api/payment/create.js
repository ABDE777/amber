// POST /api/payment/create  { name, qty, email, phone, country_residence, country_delivery, lang }
// Tokenizes the order with YouCan Pay and returns the token + public key
// for the frontend yp.js inline payment form.

import { validateOrder } from "../../lib/notify.js";
import { saveOrderToCsv } from "../../lib/orders_storage.js";
import { createPaymentSession } from "../../lib/payment.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { ok, errors, order } = validateOrder(body || {});
  if (!ok) {
    return res.status(400).json({ ok: false, error: "invalid", errors });
  }

  const orderId = `MWOA-${Date.now().toString().slice(-6)}`;
  const fullOrder = { ...order, id: orderId };

  // Pre-record the order as Pending
  try {
    await saveOrderToCsv(fullOrder, "Online Card");
  } catch (err) {
    console.warn("[Payment Order Pre-save Notice]:", err.message);
  }

  const headers = req.headers || {};
  const protocol = headers["x-forwarded-proto"] || "http";
  const host = headers["x-forwarded-host"] || headers.host || "localhost:5173";
  const baseUrl = `${protocol}://${host}`;

  const session = await createPaymentSession(fullOrder, baseUrl);

  if (!session.ok) {
    return res.status(500).json({
      ok: false,
      error: session.error || "payment_initialization_failed",
    });
  }

  return res.status(200).json({
    ok: true,
    order_id: session.order_id,
    token: session.token,           // passed to yp.js in the browser
    public_key: session.public_key, // passed to yp() constructor
    sandbox: Boolean(session.sandbox),
    amount_mad: session.amount_mad,
    configured: session.configured,
  });
}
