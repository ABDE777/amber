import fs from "fs";
import path from "path";
import { calculatePrice } from "./countries.js";

const SCHEMA_HEADERS = ["ID", "Date", "Time", "Name", "Grams", "Price", "Email", "Phone", "Country_Residence", "Country_Delivery", "Source", "Status"];
const CSV_HEADER = SCHEMA_HEADERS.join(",") + "\n";

function isServerless() {
  return (
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT)
  );
}

function getRepoCsvPath() {
  return path.resolve(process.cwd(), "data", "orders.csv");
}

function getWritableCsvPath() {
  if (isServerless()) {
    const tmpPath = path.join("/tmp", "orders.csv");
    if (!fs.existsSync(tmpPath)) {
      try {
        const repoFile = getRepoCsvPath();
        if (fs.existsSync(repoFile)) {
          const content = fs.readFileSync(repoFile, "utf8");
          fs.writeFileSync(tmpPath, content, { encoding: "utf8" });
        }
      } catch (err) {
        console.warn("[Storage] Notice: Seeding /tmp/orders.csv:", err.message);
      }
    }
    return tmpPath;
  }

  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      return path.join("/tmp", "orders.csv");
    }
  }
  return path.join(dataDir, "orders.csv");
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------
// GitHub API — Source of Truth for Vercel
// Reads and writes data/orders.csv directly in the GitHub repo
// Set GITHUB_TOKEN env var in Vercel to enable
// ---------------------------------------------------------
function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || "ABDE777/amber";
  const branch = process.env.GITHUB_BRANCH || "main";
  return { token, repo, branch };
}

async function readFromGitHub() {
  const { token, repo, branch } = getGitHubConfig();
  if (!token) return null;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/data/orders.csv?ref=${branch}&t=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MWOA-App",
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) {
      console.warn("[GitHub Read] Failed:", res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    if (data && data.content !== undefined) {
      const decoded = data.content ? Buffer.from(data.content, "base64").toString("utf8") : "";
      console.log("[GitHub Read] Loaded orders.csv from GitHub");
      return { content: decoded, sha: data.sha };
    }
  } catch (err) {
    console.warn("[GitHub Read Error]:", err.message);
  }
  return null;
}

async function writeToGitHub(csvContent, message, sha) {
  const { token, repo, branch } = getGitHubConfig();
  if (!token) {
    console.warn("[GitHub Write] Skipped: GITHUB_TOKEN not set");
    return { ok: false, error: "no_github_token" };
  }

  try {
    // Always fetch latest SHA before writing to avoid conflicts
    if (!sha) {
      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/data/orders.csv?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "MWOA-App",
        },
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    }

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/data/orders.csv`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MWOA-App",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(csvContent, "utf8").toString("base64"),
        branch,
        sha,
      }),
    });

    const result = await putRes.json();
    if (putRes.ok) {
      console.log("[GitHub Write] Committed:", message);
      return { ok: true, sha: result?.content?.sha };
    } else {
      console.error("[GitHub Write] Failed:", putRes.status, result?.message);
      return { ok: false, error: result?.message };
    }
  } catch (err) {
    console.error("[GitHub Write Error]:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Appends a new order row.
 * On Vercel: reads current state from GitHub, appends, writes back to GitHub.
 * Locally: writes to data/orders.csv.
 */
export async function saveOrderToCsv(order, source = "Order Form") {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0];
  const orderId = order.id || order.orderId || `MWOA-${Date.now().toString().slice(-6)}`;
  const status = order.status || "Pending";

  const destCountry = order.country_delivery || order.countryDelivery || order.country_residence || order.countryResidence || "";
  const priceInfo = calculatePrice(order.qty, destCountry, true);
  const priceVal = order.price || priceInfo.formattedTotal;

  const row = [
    escapeCsv(orderId),
    escapeCsv(dateStr),
    escapeCsv(timeStr),
    escapeCsv(order.name || ""),
    escapeCsv(order.qty || ""),
    escapeCsv(priceVal),
    escapeCsv(order.email || ""),
    escapeCsv(order.phone || ""),
    escapeCsv(order.country_residence || order.countryResidence || ""),
    escapeCsv(order.country_delivery || order.countryDelivery || ""),
    escapeCsv(source),
    escapeCsv(status),
  ].join(",") + "\n";

  // On Vercel: use GitHub as source of truth
  if (isServerless()) {
    const ghData = await readFromGitHub();
    if (ghData !== null) {
      let currentContent = ghData.content.replace(/^\uFEFF/, "").trim();
      const firstLine = currentContent.split(/\r?\n/)[0] || "";
      const hasHeader = firstLine.toLowerCase().includes("id") && firstLine.toLowerCase().includes("name");

      let newContent;
      if (!currentContent || !hasHeader) {
        newContent = CSV_HEADER + (currentContent && !hasHeader ? currentContent + "\n" : "") + row;
      } else {
        newContent = currentContent + "\n" + row;
      }

      const result = await writeToGitHub(newContent, `New order ${orderId} by ${order.name}`, ghData.sha);
      if (result.ok) {
        console.log(`[Storage] Order ${orderId} committed to GitHub`);
        // Also write to /tmp for fast same-container reads
        try { fs.writeFileSync(path.join("/tmp", "orders.csv"), newContent, "utf8"); } catch {}
        return { ok: true, orderId };
      } else {
        console.error("[Storage] GitHub write failed, falling back to /tmp");
      }
    } else {
      console.warn("[Storage] No GITHUB_TOKEN set — order will only be saved to /tmp (not persisted across containers)");
    }
  }

  // Local dev or GitHub fallback: write to local CSV
  const csvFile = getWritableCsvPath();
  try {
    const exists = fs.existsSync(csvFile);
    if (!exists) {
      fs.writeFileSync(csvFile, "\uFEFF" + CSV_HEADER + row, { encoding: "utf8" });
    } else {
      const currentContent = fs.readFileSync(csvFile, "utf8");
      const clean = currentContent.replace(/^\uFEFF/, "").trim();
      if (!clean) {
        fs.writeFileSync(csvFile, "\uFEFF" + CSV_HEADER + row, { encoding: "utf8" });
      } else {
        const firstLine = clean.split(/\r?\n/)[0] || "";
        const isHeader = firstLine.toLowerCase().includes("id") && firstLine.toLowerCase().includes("name");
        if (!isHeader) {
          fs.writeFileSync(csvFile, "\uFEFF" + CSV_HEADER + clean + "\n" + row, { encoding: "utf8" });
        } else {
          fs.appendFileSync(csvFile, row, { encoding: "utf8" });
        }
      }
    }
    console.log(`[Storage] Order ${orderId} saved to ${csvFile}`);
  } catch (err) {
    console.error(`[Storage] Write failed on ${csvFile}:`, err.message);
  }

  return { ok: true, orderId };
}

/**
 * Reads all orders as raw CSV.
 * On Vercel: tries GitHub first (source of truth), then /tmp, then repo file.
 * Locally: reads from data/orders.csv.
 */
export async function readOrdersCsvAsync() {
  // On Vercel: GitHub is the source of truth
  if (isServerless()) {
    const ghData = await readFromGitHub();
    if (ghData && ghData.content.trim()) {
      return ghData.content;
    }
  }

  // Local dev or GitHub unavailable: read from disk
  const pathsToTry = [
    getWritableCsvPath(),
    path.join("/tmp", "orders.csv"),
    getRepoCsvPath(),
  ];

  for (const csvFile of pathsToTry) {
    try {
      if (fs.existsSync(csvFile)) {
        const raw = fs.readFileSync(csvFile, "utf8");
        const clean = raw.replace(/^\uFEFF/, "").trim();
        if (clean.length > 0) {
          const firstLine = clean.split(/\r?\n/)[0] || "";
          const isHeader = firstLine.toLowerCase().includes("id") && firstLine.toLowerCase().includes("name");
          if (!isHeader) return "\uFEFF" + CSV_HEADER + clean + "\n";
          return raw.startsWith("\uFEFF") ? raw : "\uFEFF" + raw;
        }
      }
    } catch {
      // continue
    }
  }

  return "\uFEFF" + CSV_HEADER;
}

export function readOrdersCsv() {
  const pathsToTry = [
    getWritableCsvPath(),
    path.join("/tmp", "orders.csv"),
    getRepoCsvPath(),
  ];

  for (const csvFile of pathsToTry) {
    try {
      if (fs.existsSync(csvFile)) {
        const raw = fs.readFileSync(csvFile, "utf8");
        const clean = raw.replace(/^\uFEFF/, "").trim();
        if (clean.length > 0) {
          const firstLine = clean.split(/\r?\n/)[0] || "";
          const isHeader = firstLine.toLowerCase().includes("id") && firstLine.toLowerCase().includes("name");
          if (!isHeader) return "\uFEFF" + CSV_HEADER + clean + "\n";
          return raw.startsWith("\uFEFF") ? raw : "\uFEFF" + raw;
        }
      }
    } catch {
      // continue
    }
  }

  return "\uFEFF" + CSV_HEADER;
}

/**
 * Parses CSV string into array of order objects (most recent first)
 */
export function parseOrdersFromCsv(rawCsv = null) {
  const raw = rawCsv || readOrdersCsv();
  const clean = raw.replace(/^\uFEFF/, "").trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const firstLineVals = parseCsvLine(lines[0]);
  const isFirstLineHeader = firstLineVals[0] && firstLineVals[0].toLowerCase().includes("id");

  const headers = isFirstLineHeader ? firstLineVals.map((h) => h.trim()) : SCHEMA_HEADERS;
  const startIndex = isFirstLineHeader ? 1 : 0;

  const rows = [];
  for (let i = startIndex; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length >= 3 && vals.some((v) => v.trim())) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = vals[idx] !== undefined ? vals[idx] : "";
      });
      if (!obj.Status) obj.Status = "Pending";
      rows.push(obj);
    }
  }
  return rows.reverse();
}

/**
 * Updates order status — locks the settled price when Paid or Shipped, reads from GitHub, patches, writes back.
 */
export async function updateOrderStatus(orderId, newStatus, lockedPrice = null) {
  try {
    let rawCsv = await readOrdersCsvAsync();
    const clean = rawCsv.replace(/^\uFEFF/, "").trim();
    if (!clean) return { ok: false, error: "empty_file" };

    const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) return { ok: false, error: "no_records" };

    const firstLineVals = parseCsvLine(lines[0]);
    const isFirstLineHeader = firstLineVals[0] && firstLineVals[0].toLowerCase().includes("id");
    const headers = isFirstLineHeader ? firstLineVals.map((h) => h.trim()) : [...SCHEMA_HEADERS];
    
    let statusIdx = headers.indexOf("Status");
    if (statusIdx === -1) { headers.push("Status"); statusIdx = headers.length - 1; }

    let priceIdx = headers.indexOf("Price");
    if (priceIdx === -1) { headers.splice(5, 0, "Price"); priceIdx = 5; }

    const startIndex = isFirstLineHeader ? 1 : 0;
    let updated = false;
    const newRows = [];

    for (let i = startIndex; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      if (vals.length >= 1) {
        if (vals[0] === orderId) {
          while (vals.length < headers.length) vals.push("");
          vals[statusIdx] = newStatus;

          // Lock transaction price permanently when Paid or Shipped
          if (newStatus === "Paid" || newStatus === "Shipped") {
            if (lockedPrice) {
              vals[priceIdx] = lockedPrice;
            } else if (!vals[priceIdx] || vals[priceIdx] === "—") {
              const qty = Number(vals[headers.indexOf("Grams")]) || 0;
              const country = vals[headers.indexOf("Country_Delivery")] || vals[headers.indexOf("Country_Residence")] || "";
              const computed = calculatePrice(qty, country, true);
              vals[priceIdx] = computed.formattedTotal;
            }
          }
          updated = true;
        } else if (!vals[statusIdx]) {
          while (vals.length < headers.length) vals.push("");
          vals[statusIdx] = "Pending";
        }
        newRows.push(vals.map(escapeCsv).join(","));
      }
    }

    if (!updated) return { ok: false, error: "order_not_found" };

    const output = headers.map(escapeCsv).join(",") + "\n" + newRows.join("\n") + "\n";

    // On Vercel: write to GitHub
    if (isServerless()) {
      const result = await writeToGitHub(output, `Update order ${orderId} status to ${newStatus} with locked price`);
      if (result.ok) {
        try { fs.writeFileSync(path.join("/tmp", "orders.csv"), output, "utf8"); } catch {}
        return { ok: true, orderId, status: newStatus };
      } else {
        return { ok: false, error: result.error };
      }
    }

    // Local dev: write to disk
    const csvFile = getWritableCsvPath();
    try {
      fs.writeFileSync(csvFile, "\uFEFF" + output, { encoding: "utf8" });
    } catch (err) {
      console.warn(`[Storage] Disk write error on ${csvFile}:`, err.message);
    }

    return { ok: true, orderId, status: newStatus };
  } catch (err) {
    console.error("[Storage] updateOrderStatus Error:", err.message);
    return { ok: false, error: err.message };
  }
}
