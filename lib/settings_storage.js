// lib/settings_storage.js
// Persistent settings manager for MWOA (Base Price, etc.)
// Works seamlessly in local dev, Vercel serverless (/tmp), and GitHub sync.

import fs from "fs";
import path from "path";

const DEFAULT_SETTINGS = {
  base_price_mad: 400,
  tax_mad: 0,            // flat tax fee in MAD
  tax_percent: 0,        // legacy fallback
  shipping_mad: 0,       // flat shipping fee in MAD
  packaging_mad: 0,      // packaging/emballage fee in MAD
  pass_gateway_fee: true,// auto-gross up YouCan Pay fee (3.9% + 2 MAD)
  updated_at: new Date().toISOString(),
};

let inMemorySettings = { ...DEFAULT_SETTINGS };

function isServerless() {
  return (
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT)
  );
}

function getSettingsPath() {
  if (isServerless()) {
    return path.join("/tmp", "settings.json");
  }
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      return path.join("/tmp", "settings.json");
    }
  }
  return path.join(dataDir, "settings.json");
}

function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || "ABDE777/amber";
  const branch = process.env.GITHUB_BRANCH || "main";
  return { token, repo, branch };
}

async function readSettingsFromGitHub() {
  const { token, repo, branch } = getGitHubConfig();
  if (!token) return null;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/data/settings.json?ref=${branch}&t=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MWOA-App",
        "Cache-Control": "no-cache",
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.content) {
        const decoded = Buffer.from(data.content, "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        return { settings: parsed, sha: data.sha };
      }
    }
  } catch (err) {
    console.warn("[Settings GitHub Read Warning]:", err.message);
  }
  return null;
}

async function writeSettingsToGitHub(settingsObj, sha) {
  const { token, repo, branch } = getGitHubConfig();
  if (!token) return;

  try {
    let currentSha = sha;
    if (!currentSha) {
      const getRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/data/settings.json?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "MWOA-App",
          },
        }
      );
      if (getRes.ok) {
        const fileData = await getRes.json();
        currentSha = fileData.sha;
      }
    }

    await fetch(
      `https://api.github.com/repos/${repo}/contents/data/settings.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "MWOA-App",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Update settings: ${settingsObj.base_price_mad} MAD/g, tax ${settingsObj.tax_percent}%, ship ${settingsObj.shipping_mad} MAD, pkg ${settingsObj.packaging_mad} MAD`,
          content: Buffer.from(JSON.stringify(settingsObj, null, 2), "utf8").toString("base64"),
          branch,
          sha: currentSha,
        }),
      }
    );
  } catch (err) {
    console.warn("[Settings GitHub Write Warning]:", err.message);
  }
}

export async function getSettings() {
  // 1. If on Vercel and GitHub token configured, check GitHub
  if (isServerless()) {
    const gh = await readSettingsFromGitHub();
    if (gh && gh.settings && typeof gh.settings.base_price_mad === "number") {
      inMemorySettings = { ...inMemorySettings, ...gh.settings };
      return inMemorySettings;
    }
  }

  // 2. Read from local disk (/tmp or data/settings.json)
  const filePath = getSettingsPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.base_price_mad === "number") {
        inMemorySettings = { ...inMemorySettings, ...parsed };
        return inMemorySettings;
      }
    }
  } catch {
    // fallback to in-memory
  }

  return inMemorySettings;
}

export async function updateSettings(newSettings) {
  const current = await getSettings();
  const updated = {
    ...current,
    ...newSettings,
    updated_at: new Date().toISOString(),
  };

  if (typeof updated.base_price_mad === "string") {
    updated.base_price_mad = Number(updated.base_price_mad) || 400;
  }
  if (typeof updated.tax_mad === "string" || typeof updated.tax_mad === "number") {
    updated.tax_mad = Math.max(0, Number(updated.tax_mad) || 0);
  }
  if (typeof updated.tax_percent === "string") {
    updated.tax_percent = Math.max(0, Number(updated.tax_percent) || 0);
  }
  if (typeof updated.shipping_mad === "string") {
    updated.shipping_mad = Math.max(0, Number(updated.shipping_mad) || 0);
  }
  if (typeof updated.packaging_mad === "string") {
    updated.packaging_mad = Math.max(0, Number(updated.packaging_mad) || 0);
  }
  if (updated.pass_gateway_fee !== undefined) {
    updated.pass_gateway_fee = Boolean(updated.pass_gateway_fee);
  }

  inMemorySettings = updated;

  // Save to disk
  const filePath = getSettingsPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf8");
  } catch (err) {
    console.warn("[Settings Disk Write Error]:", err.message);
  }

  // Save to GitHub if on Vercel
  if (isServerless()) {
    await writeSettingsToGitHub(updated);
  }

  return updated;
}
