// POST /api/payment/webhook
// Webhook endpoint to receive payment event notifications from YouCan Pay.
// Marks the order as "Paid" and notifies the store admin.
//
// Real payload shape and signature scheme (confirmed against YouCan Pay's
// own official SDKs — youcan-shop/youcan-payment-php-sdk and
// devinweb/laravel-youcan-pay — since YouCan Pay's own docs site is not
// reachable from here):
//   Header:  x-youcanpay-signature: hex(hmac_sha256(JSON.stringify(body), YOUCANPAY_PRIVATE_KEY))
//   Body:    { id, event_name: "transaction.paid" | "transaction.failed" | ...,
//              payload: { transaction: { order_id, amount, status, ... }, customer: {...}, metadata: {...} } }
// The previous version of this file checked a made-up shared-secret query
// param and read order_id from body.order_id/body.data.order_id — neither
// of which YouCan Pay ever sends, so every real webhook call was rejected
// with 400 missing_order_id (or 401) and orders never left "Pending".

import crypto from "crypto";
import { updateOrderStatus, readOrdersCsvAsync, parseOrdersFromCsv } from "../../lib/orders_storage.js";
import { notifyAdmin } from "../../lib/notify.js";
import { safeEqual } from "../../lib/security.js";

function rawBodyForSignature(req) {
  // Prefer the exact bytes YouCan Pay signed. If the platform already
  // parsed JSON into an object (true on Vercel and in local dev), the best
  // we can do is re-serialize it — this matches byte-for-byte for the
  // simple, single-level JSON YouCan Pay sends, since JSON.stringify on a
  // freshly-JSON.parse'd object preserves key order.
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

function verifySignature(req) {
  const privateKey = (process.env.YOUCANPAY_PRIVATE_KEY || "").trim();
  // No private key configured means no real YouCan Pay integration is even
  // possible yet (payment/create.js runs in mock mode without one), so
  // there's no legitimate webhook to accept — fail closed.
  if (!privateKey) return { ok: false, reason: "youcanpay_not_configured" };

  const signature = req.headers?.["x-youcanpay-signature"];
  if (!signature) return { ok: false, reason: "missing_signature_header" };

  const expected = crypto.createHmac("sha256", privateKey).update(rawBodyForSignature(req)).digest("hex");
  return { ok: safeEqual(String(signature), expected), reason: "signature_mismatch" };
}

// Legacy fallback: a shared YOUCANPAY_WEBHOOK_TOKEN appended as ?token=...
// on the webhook URL, from before the real signature scheme was wired up.
// Optional — the signature check above is sufficient and needs no extra
// setup, since it reuses the private key you already have for payments.
function verifyLegacyToken(req) {
  const expected = (process.env.YOUCANPAY_WEBHOOK_TOKEN || "").trim();
  if (!expected) return false;
  let queryToken = req.query?.token;
  if (queryToken === undefined) {
    try {
      const host = req.headers?.host || "localhost";
      queryToken = new URL(req.url || "/", `http://${host}`).searchParams.get("token");
    } catch {
      queryToken = null;
    }
  }
  return Boolean(queryToken) && safeEqual(String(queryToken), expected);
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // Handle GET for healthcheck or manual webhook ping (admin convenience —
  // still gated by the legacy token so it can't be used to forge a "Paid").
  if (req.method === "GET") {
    const host = req.headers?.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    if (!url.searchParams.get("order_id")) {
      return res.status(200).json({ ok: true, service: "YouCan Pay Webhook Handler" });
    }
    if (!verifyLegacyToken(req)) {
      return res.status(401).json({ ok: false, error: "invalid_webhook_token" });
    }
    const status = url.searchParams.get("status") || "Paid";
    const updated = await updateOrderStatus(url.searchParams.get("order_id"), status);
    return res.status(200).json(updated);
  }

  const sig = verifySignature(req);
  if (!sig.ok && !verifyLegacyToken(req)) {
    console.warn("[Payment Webhook] Rejected:", sig.reason);
    return res.status(401).json({ ok: false, error: sig.reason });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const eventName = String(body?.event_name || body?.event || body?.type || "");
  const isPaid = /paid|success/i.test(eventName);

  const orderId =
    body?.payload?.transaction?.order_id ||
    body?.data?.order_id ||
    body?.order_id ||
    body?.orderId ||
    req.query?.order_id;

  if (!orderId) {
    console.warn("[Payment Webhook] No order_id found in payload; event_name:", eventName);
    return res.status(400).json({ ok: false, error: "missing_order_id" });
  }

  if (isPaid) {
    // 1. Update CSV order status to "Paid"
    const updateResult = await updateOrderStatus(orderId, "Paid");
    console.log(`[Payment Webhook] Order ${orderId} marked as Paid:`, updateResult);

    // 2. Fetch order details to notify admin
    try {
      const csv = await readOrdersCsvAsync();
      const allOrders = parseOrdersFromCsv(csv);
      const matched = allOrders.find((o) => (o.ID || o.id) === orderId);

      if (matched) {
        const orderInfo = {
          id: orderId,
          name: matched.Name,
          qty: matched.Grams,
          email: matched.Email,
          phone: matched.Phone,
          country_residence: matched.Country_Residence,
          country_delivery: matched.Country_Delivery,
        };
        await notifyAdmin(orderInfo, "ar", "Card Payment (Paid)", true);
      }
    } catch (err) {
      console.warn("[Payment Webhook Notification Notice]:", err.message);
    }
  }

  return res.status(200).json({ ok: true, received: true, order_id: orderId, event_name: eventName });
}
