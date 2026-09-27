// POST /api/payment/webhook
// Receives signed YouCan Pay events and updates the local order state.

import crypto from "crypto";
import { updateOrderStatus, readOrdersCsvAsync, parseOrdersFromCsv } from "../../lib/orders_storage.js";
import { notifyAdmin } from "../../lib/notify.js";
import { safeEqual } from "../../lib/security.js";

// Vercel must not JSON-parse this request before signature verification.
export const config = { api: { bodyParser: false } };

function getPrivateKey() {
  return (process.env.YOUCANPAY_PRIVATE_KEY || "").trim();
}

function getApiBase() {
  const key = getPrivateKey().toLowerCase();
  const sandbox = key.startsWith("pri_sandbox") || String(process.env.YOUCANPAY_SANDBOX || "true").toLowerCase() !== "false";
  return sandbox ? "https://youcanpay.com/sandbox/api" : "https://youcanpay.com/api";
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifySignature(rawBody, signature) {
  const privateKey = getPrivateKey();
  if (!privateKey) return { ok: false, reason: "youcanpay_not_configured" };
  if (!signature) return { ok: false, reason: "missing_signature_header" };

  const expected = crypto.createHmac("sha256", privateKey).update(rawBody).digest("hex");
  return { ok: safeEqual(String(signature).trim(), expected), reason: "signature_mismatch" };
}

async function getVerifiedLiveTransaction(transactionId) {
  const privateKey = getPrivateKey();
  const sandbox = getApiBase().includes("/sandbox/");

  // YouCan Pay documents sandbox tokenization separately and states that
  // sandbox keys are rejected by production API v2. For sandbox events, the
  // signed event is the available verification source.
  if (sandbox) return null;
  if (!transactionId) return null;

  const auth = Buffer.from(`${privateKey}:`).toString("base64");
  const response = await fetch(`https://youcanpay.com/api/v2/transactions/${encodeURIComponent(transactionId)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`transaction_verification_failed:${response.status}`);
  }
  return data;
}

async function notifyPaidOrder(orderId) {
  try {
    const csv = await readOrdersCsvAsync();
    const allOrders = parseOrdersFromCsv(csv);
    const matched = allOrders.find((o) => (o.ID || o.id) === orderId);
    if (!matched) return;

    await notifyAdmin({
      id: orderId,
      name: matched.Name,
      qty: matched.Grams,
      email: matched.Email,
      phone: matched.Phone,
      country_residence: matched.Country_Residence,
      country_delivery: matched.Country_Delivery,
    }, "ar", "Card Payment (Paid)", true);
  } catch (err) {
    console.warn("[Payment Webhook Notification Notice]:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "YouCan Pay Webhook Handler" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.warn("[Payment Webhook] Could not read raw body:", err.message);
    return res.status(400).json({ ok: false, error: "invalid_body" });
  }

  const signature = req.headers?.["x-youcanpay-signature"] || req.headers?.["X-YOUCANPAY-SIGNATURE"];
  const sig = verifySignature(rawBody, signature);
  if (!sig.ok) {
    console.warn("[Payment Webhook] Rejected:", sig.reason);
    return res.status(401).json({ ok: false, error: sig.reason });
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  const eventId = String(body?.id || "");
  const eventName = String(body?.event_name || "");
  const transaction = body?.payload?.transaction || {};
  const orderId = String(transaction.order_id || "");

  if (!eventId || !eventName || !orderId) {
    return res.status(400).json({ ok: false, error: "missing_event_fields" });
  }

  // Only the documented paid event can settle an order. Other events are
  // acknowledged so YouCan Pay does not retry them indefinitely.
  if (eventName !== "transaction.paid") {
    return res.status(200).json({ ok: true, received: true, event_id: eventId, event_name: eventName });
  }

  try {
    const verified = await getVerifiedLiveTransaction(transaction.id);
    if (verified) {
      const verifiedOrderId = String(verified.order_id || "");
      const verifiedStatus = String(verified.status || "").toLowerCase();
      if (verifiedOrderId !== orderId || verifiedStatus !== "paid") {
        console.warn("[Payment Webhook] Transaction verification mismatch", { orderId, verified });
        return res.status(400).json({ ok: false, error: "transaction_verification_mismatch" });
      }
    }

    // updateOrderStatus is safe to call repeatedly for the same order. The
    // signed event ID should also be persisted in a database in a future
    // migration; CSV storage remains the current Amber persistence layer.
    const updateResult = await updateOrderStatus(orderId, "Paid");
    console.log(`[Payment Webhook] Order ${orderId} marked as Paid:`, updateResult);
    await notifyPaidOrder(orderId);

    return res.status(200).json({ ok: true, received: true, event_id: eventId, order_id: orderId, event_name: eventName });
  } catch (err) {
    console.error("[Payment Webhook] Processing failed:", err.message);
    return res.status(500).json({ ok: false, error: "webhook_processing_failed" });
  }
}
