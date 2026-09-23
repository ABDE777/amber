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

    // Accept both: { base_price_mad: 500 } and { key: 'base_price_mad', value: 500 }
    let price;
    if (body.key === 'base_price_mad' && body.value !== undefined) {
      price = Number(body.value);
    } else {
      price = Number(body.base_price_mad || body.price);
    }

    if (!price || price <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_price" });
    }

    const updated = await updateSettings({ base_price_mad: price });
    return res.status(200).json({ ok: true, settings: updated });
  }

  res.setHeader("Allow", "GET, POST, PATCH");
  return res.status(405).json({ ok: false, error: "method_not_allowed" });
}
