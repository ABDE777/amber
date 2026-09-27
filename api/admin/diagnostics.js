// GET /api/admin/diagnostics — admin-only.
// Reports which notification/storage/payment channels are actually
// configured, without exposing any secret values, so a misconfigured
// deployment (missing env var, wrong SMTP password, no GitHub token) shows
// up on the dashboard instead of only in server logs the admin may not
// have access to check.

import { requireAdmin } from "../../lib/security.js";
import { getEmailConfigStatus, getWhatsAppConfigStatus } from "../../lib/notify.js";
import { getYouCanPayConfig } from "../../lib/payment.js";

function isServerless() {
  return (
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT)
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  if (!requireAdmin(req, res)) return;

  const serverless = isServerless();
  const githubConfigured = Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);

  const [email, whatsapp] = await Promise.all([
    getEmailConfigStatus(),
    Promise.resolve(getWhatsAppConfigStatus()),
  ]);

  const youcan = getYouCanPayConfig();

  return res.status(200).json({
    ok: true,
    storage: {
      // On Vercel the filesystem is wiped on every cold start, so orders
      // only survive between requests if GITHUB_TOKEN is set (writes go to
      // the repo's data/orders.csv via the GitHub API instead of disk).
      persistent: !serverless || githubConfigured,
      mode: !serverless ? "local-disk" : githubConfigured ? "github" : "ephemeral-tmp",
      github_token_configured: githubConfigured,
    },
    notifications: {
      email,
      whatsapp,
    },
    payment: {
      youcanpay_configured: youcan.isConfigured,
      youcanpay_sandbox: youcan.sandbox,
      webhook_token_configured: Boolean((process.env.YOUCANPAY_WEBHOOK_TOKEN || "").trim()),
    },
  });
}
