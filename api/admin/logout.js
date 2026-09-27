// POST /api/admin/logout — clears the admin session cookie.

import { clearAdminCookie } from "../../lib/security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  clearAdminCookie(req, res);
  return res.status(200).json({ ok: true });
}
