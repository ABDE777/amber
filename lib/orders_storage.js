import fs from "fs";
import path from "path";

const SCHEMA_HEADERS = ["ID", "Date", "Time", "Name", "Grams", "Email", "Phone", "Country_Residence", "Country_Delivery", "Source", "Status"];
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
  // On Vercel / AWS Lambda, /var/task is strictly read-only. We MUST write to /tmp.
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

  // Local environment: use data/orders.csv in repo directory
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

/**
 * Appends an order to CSV (works in local Node and Vercel Serverless /tmp)
 */
export function saveOrderToCsv(order, source = "AI Assistant") {
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

  // Try writing to target path with automatic /tmp fallback
  const targets = [getWritableCsvPath(), path.join("/tmp", "orders.csv")];

  for (const csvFile of targets) {
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
      return { ok: true, orderId, file: csvFile };
    } catch (err) {
      console.warn(`[Storage] Write failed on ${csvFile}, attempting fallback:`, err.message);
    }
  }

  return { ok: false, error: "failed_to_write_to_storage" };
}

/**
 * Returns all saved orders as raw CSV string with proper header
 */
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
export function parseOrdersFromCsv() {
  const raw = readOrdersCsv();
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
export function updateOrderStatus(orderId, newStatus) {
  try {
    const raw = readOrdersCsv();
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

    // Write to writable paths (/tmp on Vercel, or data/ locally)
    const targets = [getWritableCsvPath(), path.join("/tmp", "orders.csv")];
    for (const targetFile of targets) {
      try {
        fs.writeFileSync(targetFile, output, { encoding: "utf8" });
        console.log(`[Storage] Order ${orderId} updated to: ${newStatus} in ${targetFile}`);
        return { ok: true, orderId, status: newStatus };
      } catch (err) {
        console.warn(`[Storage] Failed writing update to ${targetFile}:`, err.message);
      }
    }

    return { ok: false, error: "could_not_write_to_file" };
  } catch (err) {
    console.error("[Storage Error] Failed to update order status:", err);
    return { ok: false, error: err.message };
  }
}
