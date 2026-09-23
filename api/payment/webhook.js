// POST /api/payment/webhook
// Webhook endpoint to receive payment event notifications from YouCan Pay.
// Marks the order as "Paid" and notifies the store admin.

import { updateOrderStatus, readOrdersCsvAsync, parseOrdersFromCsv } from "../../lib/orders_storage.js";
import { notifyAdmin } from "../../lib/notify.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
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
