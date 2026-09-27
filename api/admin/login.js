// POST /api/admin/login  { password }
// Password-only admin sign-in (no username): verifies the password against
// ADMIN_TOKEN and, on success, sets the mwoa_admin session cookie that
// requireAdmin() (lib/security.js) checks on every admin-only route.

import { safeEqual, setAdminCookie } from "../../lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const token = (process.env.ADMIN_TOKEN || "").trim();
  if (!token) {
    return res.status(503).json({ ok: false, error: "admin_not_configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const password = String(body?.password || "");

  if (!password || !safeEqual(password, token)) {
    return res.status(401).json({ ok: false, error: "invalid_password" });
  }

  setAdminCookie(req, res, token);
  return res.status(200).json({ ok: true });
}
