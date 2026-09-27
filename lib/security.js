// lib/security.js
// Shared security helpers for the admin-only endpoints (orders dashboard,
// order-status updates, pricing/fee settings): a password-only session
// cookie (no separate username, unlike browser-native HTTP Basic Auth) plus
// a constant-time secret comparison.

import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "mwoa_admin";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

// Compares two secrets without leaking their length or timing.
export function safeEqual(a, b) {
  const ah = createHash("sha256").update(String(a ?? "")).digest();
  const bh = createHash("sha256").update(String(b ?? "")).digest();
  return timingSafeEqual(ah, bh);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

function bearerToken(header) {
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function wantsHtml(req) {
  return (req.headers?.accept || "").includes("text/html");
}

function loginPageHtml({ wrongPassword = false, notConfigured = false } = {}) {
  const message = notConfigured
    ? "Admin dashboard is not configured yet. Set ADMIN_TOKEN in your environment."
    : wrongPassword
    ? "Incorrect password."
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MWOA Admin — Sign in</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#1b1213; font-family: system-ui, sans-serif; }
  form { background:#251819; border:1px solid rgba(212,175,55,.35); border-radius:12px; padding:32px 28px; width:min(320px,90vw); box-shadow:0 20px 60px rgba(0,0,0,.5); }
  h1 { color:#D4AF37; font-size:18px; margin:0 0 20px; text-align:center; }
  input { width:100%; padding:12px 14px; border-radius:8px; border:1px solid rgba(212,175,55,.4); background:#1c1112; color:#ede7da; font-size:15px; outline:none; margin-bottom:14px; }
  input:focus { border-color:#D4AF37; }
  button { width:100%; padding:12px; border:none; border-radius:8px; background:#D4AF37; color:#1a0f10; font-weight:700; font-size:15px; cursor:pointer; }
  button:disabled { opacity:.6; cursor:wait; }
  button:hover:not(:disabled) { background:#e8c250; }
  .msg { color:#ff8080; font-size:13px; margin:-6px 0 14px; text-align:center; }
</style>
</head>
<body>
  <form id="f">
    <h1>🔒 MWOA Admin</h1>
    ${message ? `<div class="msg">${message}</div>` : ""}
    <input type="password" id="pw" name="password" placeholder="Password" autofocus autocomplete="current-password" />
    <button type="submit" id="btn">Sign in</button>
  </form>
  <script>
    document.getElementById('f').addEventListener('submit', async (e) => {
      e.preventDefault();
      var btn = document.getElementById('btn');
      btn.disabled = true;
      try {
        var res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: document.getElementById('pw').value }),
        });
        window.location.href = res.ok
          ? window.location.pathname + window.location.search.replace(/[?&]auth_error=1/, '')
          : window.location.pathname + '?auth_error=1';
      } catch {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

function denyAdmin(req, res, { notConfigured = false } = {}) {
  if (wantsHtml(req) && req.method === "GET") {
    res.status(notConfigured ? 503 : 401);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const url = new URL(req.url || "/", `http://${req.headers?.host || "localhost"}`);
    res.end(loginPageHtml({ notConfigured, wrongPassword: url.searchParams.get("auth_error") === "1" }));
    return;
  }
  res.status(notConfigured ? 503 : 401).json({
    ok: false,
    error: notConfigured ? "admin_not_configured" : "unauthorized",
    ...(notConfigured
      ? { message: "Set ADMIN_TOKEN in your environment to enable the admin dashboard and settings API." }
      : {}),
  });
}

// Gate for admin-only API routes. Returns true if the request is authorized
// (the caller should proceed); otherwise it has already written the
// response (401/503, or a password-only login page for a direct browser
// visit) and the caller must return immediately.
//
// Accepts either the `mwoa_admin` session cookie set by /api/admin/login,
// or an `Authorization: Bearer <ADMIN_TOKEN>` header (handy for curl/API
// use). Deliberately does NOT use HTTP Basic Auth — that forces the
// browser's native two-field (username + password) prompt; this is a
// password-only login instead.
//
// Requires ADMIN_TOKEN to be set — fails closed when it isn't, since these
// endpoints expose customer PII and let anyone rewrite storefront pricing.
export function requireAdmin(req, res) {
  const token = (process.env.ADMIN_TOKEN || "").trim();
  if (!token) {
    denyAdmin(req, res, { notConfigured: true });
    return false;
  }

  const cookies = parseCookies(req.headers?.cookie);
  const cookieToken = cookies[ADMIN_COOKIE];
  if (cookieToken && safeEqual(cookieToken, token)) return true;

  const provided = bearerToken(req.headers?.authorization || req.headers?.Authorization || "");
  if (provided && safeEqual(provided, token)) return true;

  denyAdmin(req, res);
  return false;
}

// Sets the admin session cookie after a verified /api/admin/login. HttpOnly
// (unreachable from JS, so an XSS bug can't read it) and Secure outside
// local dev.
export function setAdminCookie(req, res, token) {
  const isLocal = !(process.env.VERCEL || process.env.VERCEL_ENV);
  const secure = isLocal ? "" : "; Secure";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
  );
}

export function clearAdminCookie(req, res) {
  const isLocal = !(process.env.VERCEL || process.env.VERCEL_ENV);
  const secure = isLocal ? "" : "; Secure";
  res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`);
}
