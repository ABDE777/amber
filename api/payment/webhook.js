// POST /api/payment/webhook
// Webhook endpoint to receive payment event notifications from YouCan Pay.
// Marks the order as "Paid" and notifies the store admin.

import { updateOrderStatus, readOrdersCsvAsync, parseOrdersFromCsv } from "../../lib/orders_storage.js";
import { notifyAdmin } from "../../lib/notify.js";
import { safeEqual } from "../../lib/security.js";

// Verifies the shared secret configured as YOUCANPAY_WEBHOOK_TOKEN. Without
// it, anyone who finds this URL can POST {order_id, status:"paid"} and mark
// any order as paid. Configure the token and append `?token=<it>` (or send
// it as an `x-webhook-token` header) on the webhook URL registered with
// YouCan Pay to close that hole. Fails open (with a loud warning) until the
// token is set, so existing unconfigured deployments don't silently break.
function verifyWebhookToken(req) {
  const expected = (process.env.YOUCANPAY_WEBHOOK_TOKEN || "").trim();
  if (!expected) return { configured: false, ok: true };

  // Vercel's Node runtime pre-parses the query string into req.query; our
  // local dev middleware (vite.config.js) does not, so fall back to parsing
  // req.url by hand there. Checking both makes this robust across the two.
  let queryToken = req.query?.token;
  if (queryToken === undefined) {
    try {
      const host = req.headers?.host || "localhost";
      queryToken = new URL(req.url || "/", `http://${host}`).searchParams.get("token");
    } catch {
      queryToken = null;
    }
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const provided = req.headers?.["x-webhook-token"] || queryToken || body.token || "";

  return { configured: true, ok: Boolean(provided) && safeEqual(String(provided), expected) };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const verify = verifyWebhookToken(req);
  if (!verify.configured) {
    console.warn(
      "[Payment Webhook] YOUCANPAY_WEBHOOK_TOKEN is not set — this endpoint is UNVERIFIED and anyone can mark orders as paid. Set YOUCANPAY_WEBHOOK_TOKEN and add ?token=<it> to the webhook URL configured in YouCan Pay."
    );
  } else if (!verify.ok) {
    // No secret values logged — just enough to tell "token missing from the
    // request" apart from "token present but doesn't match ADMIN env var".
    console.warn(
      "[Payment Webhook] Rejected: webhook token missing or mismatched",
      { hasQueryToken: req.query?.token !== undefined, hasUrl: Boolean(req.url) }
    );
    return res.status(401).json({ ok: false, error: "invalid_webhook_token" });
  }

  // Handle GET for healthcheck or manual webhook ping
  if (req.method === "GET") {
    const host = req.headers?.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    const orderId = url.searchParams.get("order_id");
    const status = url.searchParams.get("status") || "Paid";

    if (orderId) {
      const updated = await updateOrderStatus(orderId, status);
      return res.status(200).json(updated);
    }

    return res.status(200).json({ ok: true, service: "YouCan Pay Webhook Handler" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  // Extract order ID from webhook payload or query params
  const orderId = body?.order_id || body?.orderId || body?.data?.order_id || req.query?.order_id;
  const event = body?.event || body?.type || "transaction.paid";
  const isPaid = event.includes("paid") || body?.status === "paid" || body?.data?.status === "paid";

  if (!orderId) {
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

  return res.status(200).json({ ok: true, received: true, order_id: orderId });
}
