import fs from "fs";
import path from "path";

const SCHEMA_HEADERS = ["ID", "Date", "Time", "Name", "Grams", "Email", "Phone", "Country_Residence", "Country_Delivery", "Source", "Status"];
const CSV_HEADER = SCHEMA_HEADERS.join(",") + "\n";

// In-memory cache for fast cross-request reads in warm serverless containers
let memoryOrdersCache = null;

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
// Optional GitHub API Sync (Persists orders directly to repo)
// ---------------------------------------------------------
async function syncToGitHub(csvContent, message = "Update orders.csv from MWOA app") {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || "ABDE777/amber";
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token) return { ok: false, error: "no_github_token" };

  try {
    const getUrl = `https://api.github.com/repos/${repo}/contents/data/orders.csv?ref=${branch}`;
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MWOA-App",
      },
    });

    let sha = undefined;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const putUrl = `https://api.github.com/repos/${repo}/contents/data/orders.csv`;
    const putRes = await fetch(putUrl, {
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

    return { ok: putRes.ok };
  } catch (err) {
    console.error("[GitHub Sync Error]:", err.message);
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------
// Optional Upstash Redis / Vercel KV Sync
// ---------------------------------------------------------
async function syncToKV(csvContent) {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvToken) return { ok: false };

  try {
    const res = await fetch(`${kvUrl}/set/mwoa_orders_csv`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
      body: JSON.stringify(csvContent),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

async function readFromKV() {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvToken) return null;

  try {
    const res = await fetch(`${kvUrl}/get/mwoa_orders_csv`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.result === "string" && data.result.trim()) {
        return data.result;
      }
    }
  } catch {
    /* fallback to disk */
  }
  return null;
}

/**
 * Appends an order to CSV (works in local Node and Vercel Serverless /tmp)
 */
export async function saveOrderToCsv(order, source = "AI Assistant") {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(" ")[0]; // HH:mm:ss
  const orderId = order.id || order.orderId || `MWOA-${Date.now().toString().slice(-6)}`;
  const status = order.status || "Pending";

  const row = [
    escapeCsv(orderId),
    escapeCsv(dateStr),
    escapeCsv(timeStr),
    escapeCsv(order.name || ""),
    escapeCsv(order.qty || ""),
    escapeCsv(order.email || ""),
    escapeCsv(order.phone || ""),
    escapeCsv(order.country_residence || order.countryResidence || ""),
    escapeCsv(order.country_delivery || order.countryDelivery || ""),
    escapeCsv(source),
    escapeCsv(status),
  ].join(",") + "\n";

  let savedContent = "";
  const targets = [getWritableCsvPath(), path.join("/tmp", "orders.csv")];

  for (const csvFile of targets) {
    try {
      const exists = fs.existsSync(csvFile);
      if (!exists) {
        savedContent = "\uFEFF" + CSV_HEADER + row;
        fs.writeFileSync(csvFile, savedContent, { encoding: "utf8" });
      } else {
        const currentContent = fs.readFileSync(csvFile, "utf8");
        const clean = currentContent.replace(/^\uFEFF/, "").trim();
        if (!clean) {
          savedContent = "\uFEFF" + CSV_HEADER + row;
          fs.writeFileSync(csvFile, savedContent, { encoding: "utf8" });
        } else {
          const firstLine = clean.split(/\r?\n/)[0] || "";
          const isHeader = firstLine.toLowerCase().includes("id") && firstLine.toLowerCase().includes("name");
          if (!isHeader) {
            savedContent = "\uFEFF" + CSV_HEADER + clean + "\n" + row;
            fs.writeFileSync(csvFile, savedContent, { encoding: "utf8" });
          } else {
            fs.appendFileSync(csvFile, row, { encoding: "utf8" });
            savedContent = currentContent + row;
          }
        }
      }

      console.log(`[Storage] Order ${orderId} saved to ${csvFile}`);
      break;
    } catch (err) {
      console.warn(`[Storage] Write failed on ${csvFile}:`, err.message);
    }
  }

  // Sync to Cloud KV / GitHub if configured
  if (savedContent) {
    syncToKV(savedContent).catch(() => {});
    syncToGitHub(savedContent, `New order ${orderId} by ${order.name}`).catch(() => {});
  }

  return { ok: true, orderId };
}

/**
 * Returns all saved orders as raw CSV string with proper header
 */
export async function readOrdersCsvAsync() {
  // Check Cloud KV first if configured
  const kvData = await readFromKV();
  if (kvData) return kvData;

  const pathsToTry = [
    path.join("/tmp", "orders.csv"),
    getWritableCsvPath(),
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
          if (!isHeader) {
            return "\uFEFF" + CSV_HEADER + clean + "\n";
          }
          return raw.startsWith("\uFEFF") ? raw : "\uFEFF" + raw;
        }
      }
    } catch {
      // Continue to next path
    }
  }

  return "\uFEFF" + CSV_HEADER;
}

export function readOrdersCsv() {
  const pathsToTry = [
    path.join("/tmp", "orders.csv"),
    getWritableCsvPath(),
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
          if (!isHeader) {
            return "\uFEFF" + CSV_HEADER + clean + "\n";
          }
          return raw.startsWith("\uFEFF") ? raw : "\uFEFF" + raw;
        }
      }
    } catch {
      // Continue to next path
    }
  }

  return "\uFEFF" + CSV_HEADER;
}

/**
 * Parses all saved orders into array of objects (most recent first)
 */
export function parseOrdersFromCsv(rawCsv = null) {
  const raw = rawCsv || readOrdersCsv();
  const clean = raw.replace(/^\uFEFF/, "").trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const firstLineVals = parseCsvLine(lines[0]);
  const isFirstLineHeader = firstLineVals[0] && (firstLineVals[0].toLowerCase().includes("id"));

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

      if (!obj.ID && vals[0]) obj.ID = vals[0];
      if (!obj.Date && vals[1]) obj.Date = vals[1];
      if (!obj.Time && vals[2]) obj.Time = vals[2];
      if (!obj.Name && vals[3]) obj.Name = vals[3];
      if (!obj.Grams && vals[4]) obj.Grams = vals[4];
      if (!obj.Email && vals[5]) obj.Email = vals[5];
      if (!obj.Phone && vals[6]) obj.Phone = vals[6];
      if (!obj.Country_Residence && vals[7]) obj.Country_Residence = vals[7];
      if (!obj.Country_Delivery && vals[8]) obj.Country_Delivery = vals[8];
      if (!obj.Source && vals[9]) obj.Source = vals[9];
      if (!obj.Status) obj.Status = vals[10] || "Pending";

      rows.push(obj);
    }
  }
  return rows.reverse();
}

/**
 * Updates the status of an existing order (Vercel serverless & local compatible)
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const raw = await readOrdersCsvAsync();
    const clean = raw.replace(/^\uFEFF/, "").trim();
    if (!clean) return { ok: false, error: "empty_file" };

    const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) return { ok: false, error: "no_records" };

    const firstLineVals = parseCsvLine(lines[0]);
    const isFirstLineHeader = firstLineVals[0] && firstLineVals[0].toLowerCase().includes("id");

    const headers = isFirstLineHeader ? firstLineVals.map((h) => h.trim()) : [...SCHEMA_HEADERS];
    let statusIdx = headers.indexOf("Status");
    if (statusIdx === -1) {
      headers.push("Status");
      statusIdx = headers.length - 1;
    }

    const startIndex = isFirstLineHeader ? 1 : 0;
    let updated = false;
    const newRows = [];

    for (let i = startIndex; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      if (vals.length >= 1) {
        if (vals[0] === orderId) {
          while (vals.length < headers.length) vals.push("");
          vals[statusIdx] = newStatus;
          updated = true;
        } else if (!vals[statusIdx]) {
          while (vals.length < headers.length) vals.push("");
          vals[statusIdx] = "Pending";
        }
        newRows.push(vals.map(escapeCsv).join(","));
      }
    }

    if (!updated) {
      return { ok: false, error: "order_not_found" };
    }

    const output = "\uFEFF" + headers.map(escapeCsv).join(",") + "\n" + newRows.join("\n") + "\n";

    const targets = [getWritableCsvPath(), path.join("/tmp", "orders.csv")];
    for (const targetFile of targets) {
      try {
        fs.writeFileSync(targetFile, output, { encoding: "utf8" });
        console.log(`[Storage] Order ${orderId} updated to: ${newStatus} in ${targetFile}`);
      } catch (err) {
        console.warn(`[Storage] Failed writing update to ${targetFile}:`, err.message);
      }
    }

    syncToKV(output).catch(() => {});
    syncToGitHub(output, `Update order ${orderId} status to ${newStatus}`).catch(() => {});

    return { ok: true, orderId, status: newStatus };
  } catch (err) {
    console.error("[Storage Error] Failed to update order status:", err);
    return { ok: false, error: err.message };
  }
}
