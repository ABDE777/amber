// POST /api/payment/webhook
// Receives signed YouCan Pay events and updates the local order state.
//
// Signature: x-youcanpay-signature header = hex(hmac_sha256(exact raw
// request body bytes, YOUCANPAY_PRIVATE_KEY)). Verified over the real bytes
// via bodyParser:false below — a documented Vercel Node Functions config,
// not Next.js-only: https://vercel.com/kb/guide/how-do-i-get-the-raw-body-of-a-serverless-function
//
// Payload shape and the transactions endpoint below are both confirmed
// against YouCan Pay's own official SDKs (youcan-shop/youcan-payment-php-sdk,
// devinweb/laravel-youcan-pay) — their docs site isn't reachable from here —
// and the shape has now also been confirmed by a real production delivery
// this endpoint successfully processed.

import crypto from "crypto";
import { updateOrderStatus, readOrdersCsvAsync, parseOrdersFromCsv } from "../../lib/orders_storage.js";
import { notifyAdmin } from "../../lib/notify.js";
import { safeEqual } from "../../lib/security.js";

// Vercel must not JSON-parse this request before signature verification —
// the signature covers the exact raw bytes YouCan Pay sent.
export const config = { api: { bodyParser: false } };

function getPrivateKey() {
  return (process.env.YOUCANPAY_PRIVATE_KEY || "").trim();
}

function isSandbox() {
  const key = getPrivateKey().toLowerCase();
  if (key.startsWith("pri_sandbox")) return true;
  if (key.includes("live") || key.includes("prod")) return false;
  return String(process.env.YOUCANPAY_SANDBOX || "true").trim().toLowerCase() !== "false";
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    console.log("[Payment Webhook] Raw body source: Buffer (bodyParser:false honored)");
    return req.body;
  }
  if (typeof req.body === "string") {
    console.log("[Payment Webhook] Raw body source: string");
    return Buffer.from(req.body);
  }
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
    // Something upstream already parsed JSON — either our local Vite dev
    // middleware (which doesn't honor bodyParser:false), or Vercel itself
    // ignoring that config for this deployment. Either way we've lost the
    // exact original bytes; re-serializing is the best recovery, and
    // verifySignature() below also tries this same buffer as a fallback
    // candidate in case this *is* the pre-parsed object.
    console.warn("[Payment Webhook] Raw body source: pre-parsed object (bodyParser:false NOT honored) — signature verification may fail on byte differences");
    return Buffer.from(JSON.stringify(req.body));
  }
  console.log("[Payment Webhook] Raw body source: stream read");
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function hmacHex(privateKey, buf) {
  return crypto.createHmac("sha256", privateKey).update(buf).digest("hex");
}

function verifySignature(rawBody, signature) {
  const privateKey = getPrivateKey();
  if (!privateKey) return { ok: false, reason: "youcanpay_not_configured" };
  if (!signature) return { ok: false, reason: "missing_signature_header" };

  const provided = String(signature).trim();

  // Primary: HMAC over the exact bytes we received.
  if (safeEqual(provided, hmacHex(privateKey, rawBody))) {
    return { ok: true, reason: "matched_raw" };
  }

  // Fallback: if those bytes are valid JSON, also try the canonical
  // re-serialization — guards against a byte-level difference introduced
  // somewhere between YouCan Pay and this handler (e.g. bodyParser:false
  // silently not being honored, or whitespace/formatting differences) that
  // would otherwise reject an otherwise-legitimate, correctly-signed event.
  try {
    const canonical = Buffer.from(JSON.stringify(JSON.parse(rawBody.toString("utf8"))));
    if (!canonical.equals(rawBody) && safeEqual(provided, hmacHex(privateKey, canonical))) {
      console.warn("[Payment Webhook] Signature matched only the re-serialized JSON, not the raw bytes — investigate the raw body source above.");
      return { ok: true, reason: "matched_canonical" };
    }
  } catch {
    // rawBody wasn't valid JSON; nothing more to try.
  }

  return { ok: false, reason: "signature_mismatch" };
}

// Extra defense-in-depth for live transactions: look the transaction up
// directly with YouCan Pay rather than trusting the webhook body alone.
// Endpoint confirmed from their PHP SDK's TransactionEndpoint::get() —
// GET {apiBase}/transactions/{id}?pri_key=... — NOT the /api/v2 + Basic
// Auth shape a previous version of this file guessed at, which targeted a
// path that doesn't exist in their SDK and would have failed (and thus
// blocked *every* live payment from ever completing) the moment this ran
// against a real production key. Skipped for sandbox, matching the SDK's
// own sandbox/live split.
async function fetchLiveTransaction(transactionId) {
  if (isSandbox() || !transactionId) return null;

  const privateKey = getPrivateKey();
  const url = `https://youcanpay.com/api/transactions/${encodeURIComponent(transactionId)}?pri_key=${encodeURIComponent(privateKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`transaction_verification_failed:${response.status}`);
  }
  return data;
}

// Depth-first search for the first key matching `pattern` anywhere in the
// object tree. Only used as a fallback if YouCan Pay ever nests fields
// differently than the confirmed shape above — safe here since it only
// runs on a payload that already passed signature verification.
function findDeep(obj, pattern, seen = new Set()) {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return undefined;
  seen.add(obj);
  for (const [k, v] of Object.entries(obj)) {
    if (pattern.test(k) && (typeof v === "string" || typeof v === "number")) return v;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = findDeep(v, pattern, seen);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

async function notifyPaidOrder(orderId) {
  try {
    const csv = await readOrdersCsvAsync();
    const allOrders = parseOrdersFromCsv(csv);
    const matched = allOrders.find((o) => (o.ID || o.id) === orderId);
    if (!matched) {
      console.warn(`[Payment Webhook] Order ${orderId} was marked Paid but not found for the admin notification`);
      return;
    }
    await notifyAdmin(
      {
        id: orderId,
        name: matched.Name,
        qty: matched.Grams,
        email: matched.Email,
        phone: matched.Phone,
        country_residence: matched.Country_Residence,
        country_delivery: matched.Country_Delivery,
      },
      "ar",
      "Card Payment (Paid)",
      true
    );
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

  const signature = req.headers?.["x-youcanpay-signature"];
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
  const eventName = String(body?.event_name || findDeep(body, /^event(_?name)?$|^type$/i) || "");
  const transaction = body?.payload?.transaction || {};
  const orderId = String(transaction.order_id || findDeep(body, /^order_?id$/i) || "");

  console.log("[Payment Webhook] Received:", { eventId, eventName, orderId });

  if (!orderId) {
    console.warn("[Payment Webhook] No order_id found in payload");
    return res.status(400).json({ ok: false, error: "missing_order_id" });
  }

  // Only the documented paid event settles an order. Others (failed,
  // refunded, ...) are acknowledged so YouCan Pay doesn't retry them
  // forever, but change nothing.
  if (eventName !== "transaction.paid") {
    return res.status(200).json({ ok: true, received: true, event_id: eventId, order_id: orderId, event_name: eventName, applied: false });
  }

  try {
    const verified = await fetchLiveTransaction(transaction.id);
    if (verified && String(verified.order_id || "") !== orderId) {
      console.warn("[Payment Webhook] Transaction/order mismatch on live lookup", { orderId, verifiedOrderId: verified.order_id });
      return res.status(400).json({ ok: false, error: "transaction_verification_mismatch" });
    }

    const updateResult = await updateOrderStatus(orderId, "Paid");
    console.log(`[Payment Webhook] Order ${orderId} marked as Paid:`, updateResult);

    if (!updateResult.ok) {
      // Non-200 so YouCan Pay's dashboard shows a real failure (and
      // retries) instead of a misleading "Success" while the order stays
      // Pending.
      return res.status(500).json({ ok: false, error: "update_failed", detail: updateResult.error });
    }

    await notifyPaidOrder(orderId);

    return res.status(200).json({ ok: true, received: true, event_id: eventId, order_id: orderId, event_name: eventName, applied: true });
  } catch (err) {
    console.error("[Payment Webhook] Processing failed:", err.message);
    return res.status(500).json({ ok: false, error: "webhook_processing_failed" });
  }
}
