// lib/payment.js — YouCan Pay card payment service for MWOA
// Uses yp.js (v2 embedded form approach) — no redirect, payment happens inline.
// Docs: https://developer.youcan.shop/youcan-pay/yp-js/getting-started

import { BASE_PRICE_MAD } from "./countries.js";
import { getSettings } from "./settings_storage.js";

export function getYouCanPayConfig() {
  const privateKey = (process.env.YOUCANPAY_PRIVATE_KEY || "").trim();
  const publicKey = (process.env.YOUCANPAY_PUBLIC_KEY || "").trim();

  // Auto-detect sandbox from key prefix OR env var
  let sandbox;
  if (privateKey.toLowerCase().startsWith("pri_sandbox") || publicKey.toLowerCase().startsWith("pub_sandbox")) {
    sandbox = true;
  } else if (privateKey.toLowerCase().includes("live") || privateKey.toLowerCase().includes("prod")) {
    sandbox = false;
  } else {
    sandbox = String(process.env.YOUCANPAY_SANDBOX || "true").trim().toLowerCase() !== "false";
  }

  // Sandbox uses a different base URL for tokenizing
  const apiBase = sandbox
    ? "https://youcanpay.com/sandbox/api"
    : "https://youcanpay.com/api";

  return {
    sandbox,
    privateKey,
    publicKey,
    apiBase,
    isConfigured: Boolean(privateKey),
  };
}

/**
 * Server-side: Tokenizes a payment with YouCan Pay.
 * Returns { ok, token, public_key, order_id, amount_mad } for the frontend to use with yp.js.
 *
 * @param {Object} order { id, name, qty, email, phone, country_residence, country_delivery }
 * @param {string} returnUrl Base website URL (e.g. https://your-site.vercel.app)
 */
export async function createPaymentSession(order, returnUrl) {
  const config = getYouCanPayConfig();
  const orderId = order.id || `MWOA-${Date.now().toString().slice(-6)}`;
  const qty = Number(order.qty) || 1;

  // Always read the live admin price and fees
  let basePriceMad = BASE_PRICE_MAD;
  let taxMad = 0;
  let shippingMad = 0;
  let packagingMad = 0;
  let passGatewayFee = true;
  try {
    const settings = await getSettings();
    if (settings?.base_price_mad > 0) basePriceMad = Number(settings.base_price_mad);
    taxMad = Math.max(0, Number(settings?.tax_mad ?? settings?.tax_percent) || 0);
    shippingMad = Math.max(0, Number(settings?.shipping_mad) || 0);
    packagingMad = Math.max(0, Number(settings?.packaging_mad) || 0);
    if (settings?.pass_gateway_fee !== undefined) passGatewayFee = Boolean(settings.pass_gateway_fee);
  } catch { /* fall back to defaults */ }

  const netMad = (qty * basePriceMad) + taxMad + shippingMad + packagingMad;
  // Gross-up so that when YouCan Pay deducts 3.9% + 2 MAD, the merchant receives exactly netMad
  const totalMad = passGatewayFee
    ? Math.round((netMad + 2) / (1 - 0.039))
    : Math.round(netMad);
  // YouCan Pay expects the amount in centimes (1 MAD = 100 centimes)
  const amountInCentimes = totalMad * 100;

  const base = (returnUrl || "").replace(/\/+$/, "");
  const successUrl = `${base}/?payment=success&order_id=${encodeURIComponent(orderId)}`;
  const errorUrl   = `${base}/?payment=error&order_id=${encodeURIComponent(orderId)}`;

  // If keys are not configured → mock mode (development without YouCan Pay account)
  if (!config.isConfigured) {
    console.warn("[YouCan Pay] YOUCANPAY_PRIVATE_KEY not set. Running in mock mode.");
    return {
      ok: true,
      configured: false,
      order_id: orderId,
      amount_mad: totalMad,
      token: `mock_tok_${Date.now()}`,
      public_key: config.publicKey || "pub_sandbox_mock",
    };
  }

  // Build form-encoded body (YouCan Pay tokenize endpoint requires multipart/form-data)
  const form = new FormData();
  form.append("pri_key",     config.privateKey);
  form.append("amount",      String(amountInCentimes));
  form.append("currency",    "MAD");
  form.append("order_id",    orderId);
  form.append("success_url", successUrl);
  form.append("error_url",   errorUrl);
  if (order.name)  form.append("customer[name]",  order.name);
  if (order.email) form.append("customer[email]", order.email);
  if (order.phone) form.append("customer[phone]", order.phone);
  form.append("metadata[grams]",   String(qty));
  form.append("metadata[store]",   "MWOA Ambergris");
  form.append("metadata[base_price_mad]", String(basePriceMad));

  try {
    const res = await fetch(`${config.apiBase}/tokenize`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.token) {
      console.error("[YouCan Pay Tokenize Error]:", res.status, data);
      return {
        ok: false,
        error: data?.message || data?.error || "tokenization_failed",
      };
    }

    // v1 API: token is a plain string e.g. "cp500014337"
    // v2 API: token is an object { id: "token_xxx" }
    const tokenValue = typeof data.token === "string" ? data.token : (data.token?.id || "");

    if (!tokenValue) {
      return { ok: false, error: "empty_token_received" };
    }

    return {
      ok: true,
      configured: true,
      order_id: orderId,
      amount_mad: totalMad,
      token: tokenValue,
      public_key: config.publicKey,
      sandbox: Boolean(config.sandbox),
      transaction_id: data.transaction_id,
    };
  } catch (err) {
    console.error("[YouCan Pay Network Error]:", err);
    return { ok: false, error: err.message || "network_error" };
  }
}
