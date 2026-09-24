// GET /api/settings — Retrieve current site settings (base price, etc.)
// POST /api/settings — Update base price or other settings

import { getSettings, updateSettings } from "../lib/settings_storage.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "GET") {
    const settings = await getSettings();
    return res.status(200).json({ ok: true, settings });
  }

  if (req.method === "POST" || req.method === "PATCH") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    // Accept legacy single-key format: { key: 'base_price_mad', value: 500 }
    if (body.key === "base_price_mad" && body.value !== undefined) {
      body = { base_price_mad: Number(body.value) };
    }

    const newSettings = {};

    const price = Number(body.base_price_mad || body.price);
    if (price > 0) newSettings.base_price_mad = price;

    if (body.tax_mad !== undefined) {
      const v = Math.max(0, Number(body.tax_mad) || 0);
      newSettings.tax_mad = v;
      newSettings.tax_percent = v;
    } else if (body.tax_percent !== undefined) {
      const v = Math.max(0, Number(body.tax_percent) || 0);
      newSettings.tax_mad = v;
      newSettings.tax_percent = v;
    }
    if (body.shipping_mad !== undefined) {
      const v = Math.max(0, Number(body.shipping_mad) || 0);
      newSettings.shipping_mad = v;
    }
    if (body.packaging_mad !== undefined) {
      const v = Math.max(0, Number(body.packaging_mad) || 0);
      newSettings.packaging_mad = v;
    }
    if (body.pass_gateway_fee !== undefined) {
      newSettings.pass_gateway_fee = Boolean(body.pass_gateway_fee);
    }

    if (Object.keys(newSettings).length === 0) {
      return res.status(400).json({ ok: false, error: "no_valid_fields" });
    }

    const updated = await updateSettings(newSettings);
    return res.status(200).json({ ok: true, settings: updated });
  }

  res.setHeader("Allow", "GET, POST, PATCH");
  return res.status(405).json({ ok: false, error: "method_not_allowed" });
}
