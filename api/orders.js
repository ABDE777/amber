import { readOrdersCsvAsync, parseOrdersFromCsv, updateOrderStatus } from "../lib/orders_storage.js";
import { requireAdmin } from "../lib/security.js";

// Every method on this route exposes customer PII (name/email/phone/address)
// or lets the caller mutate order status, so the whole handler is gated.
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  // Handle POST/PATCH to update order status
  if (req.method === "POST" || req.method === "PATCH") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const orderId = String(body?.orderId || body?.id || "").trim();
    const status = String(body?.status || "").trim();

    if (!orderId || !status) {
      return res.status(400).json({ ok: false, error: "missing_orderId_or_status" });
    }

    const result = await updateOrderStatus(orderId, status);
    return res.status(result.ok ? 200 : 400).json(result);
  }

  // GET Requests:
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const format = url.searchParams.get("format");
  const download = url.searchParams.get("download");

  // 1. Raw CSV Download
  if (format === "csv" || download === "1") {
    const csvContent = await readOrdersCsvAsync();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mwoa_orders.csv"');
    res.status(200);
    return res.end(csvContent);
  }

  // 2. JSON API
  if (format === "json" || (req.headers.accept || "").includes("application/json")) {
    const rawCsv = await readOrdersCsvAsync();
    const orders = parseOrdersFromCsv(rawCsv);
    return res.status(200).json({
      ok: true,
      total_orders: orders.length,
      orders,
    });
  }

  // 3. Direct browser navigation to /api/orders (no format=json/csv, not an
  // XHR/fetch request): send them to the real admin dashboard instead of a
  // second, hand-written HTML page that has to be kept in sync with it by
  // hand — this route used to render its own full dashboard here, which is
  // exactly how it silently fell behind (no invoice button, no system
  // status panel) while the React one kept evolving.
  return res.writeHead(302, { Location: "/?admin=1" }).end();
}
