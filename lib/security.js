// lib/security.js
// Shared security helpers: constant-time secret comparison and a simple
// HTTP Basic Auth gate for the admin-only endpoints (orders dashboard,
// order-status updates, pricing/fee settings).

import { createHash, timingSafeEqual } from "crypto";

// Compares two secrets without leaking their length or timing.
export function safeEqual(a, b) {
  const ah = createHash("sha256").update(String(a ?? "")).digest();
  const bh = createHash("sha256").update(String(b ?? "")).digest();
  return timingSafeEqual(ah, bh);
}

function extractCredential(header) {
  if (!header) return "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      // Any username is accepted — only the password (ADMIN_TOKEN) matters.
      return idx >= 0 ? decoded.slice(idx + 1) : decoded;
    } catch {
      return "";
    }
  }
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return "";
}

// Gate for admin-only API routes. Returns true if the request is authorized
// (the caller should proceed); otherwise it has already written the
// response (401/503) and the caller must return immediately.
//
// Requires ADMIN_TOKEN to be set — fails closed (503) when it isn't, since
// these endpoints expose customer PII and let anyone rewrite storefront
// pricing. Set ADMIN_TOKEN in your environment to enable them.
export function requireAdmin(req, res) {
  const token = (process.env.ADMIN_TOKEN || "").trim();
  if (!token) {
    res.status(503).json({
      ok: false,
      error: "admin_not_configured",
      message: "Set ADMIN_TOKEN in your environment to enable the admin dashboard and settings API.",
    });
    return false;
  }

  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const provided = extractCredential(header);

  if (!provided || !safeEqual(provided, token)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="MWOA Admin", charset="UTF-8"');
    res.status(401).json({ ok: false, error: "unauthorized" });
    return false;
  }

  return true;
}
