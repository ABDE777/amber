// ---------------------------------------------------------------------------
// Supabase (PostgREST) storage adapter for MWOA orders.
//
// This is an OPTIONAL backend. It turns on automatically the moment both
// SUPABASE_URL and a key (SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY as a
// fallback) are present in the environment. When it is not configured the app
// keeps using the existing CSV / GitHub storage in lib/orders_storage.js, so
// nothing breaks without it.
//
// It talks to Supabase over the auto-generated REST API (PostgREST) using
// plain fetch — the same dependency-free style the GitHub backend already uses.
// Run supabase/migrations/0001_orders.sql once against the project to create
// the `orders` table these functions read and write.
// ---------------------------------------------------------------------------

import { calculatePrice } from "./countries.js";

// CSV schema the rest of the app speaks. Supabase rows are serialised back into
// exactly this shape so parseOrdersFromCsv / the CSV download keep working.
const SCHEMA_HEADERS = [
  "ID", "Date", "Time", "Name", "Grams", "Price", "Email", "Phone",
  "Country_Residence", "Country_Delivery", "Source", "Status",
];
const CSV_HEADER = SCHEMA_HEADERS.join(",") + "\n";
const TABLE = "orders";

// CSV header  ->  snake_case Postgres column
const COLUMN_MAP = {
  ID: "id",
  Date: "date",
  Time: "time",
  Name: "name",
  Grams: "grams",
  Price: "price",
  Email: "email",
  Phone: "phone",
  Country_Residence: "country_residence",
  Country_Delivery: "country_delivery",
  Source: "source",
  Status: "status",
};

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  // Prefer the service-role key (bypasses RLS for server-side writes); fall
  // back to the anon key so read-only setups still work.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";
  return { url: url.replace(/\/+$/, ""), key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

function restHeaders(extra = {}) {
  const { key } = getSupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// A Supabase row -> the ordered CSV cells, so the string output is byte-for-byte
// compatible with what parseOrdersFromCsv already expects.
function rowToCsvLine(row) {
  return SCHEMA_HEADERS.map((h) => escapeCsv(row[COLUMN_MAP[h]] ?? "")).join(",");
}

/**
 * INSERT a new order. Mirrors saveOrderToCsv's field derivation so the two
 * backends produce identical records.
 * @returns {Promise<{ok: boolean, orderId?: string, error?: string}>}
 */
export async function sbInsertOrder(order, source = "Order Form") {
  const { url } = getSupabaseConfig();
  const now = new Date();
  const orderId = order.id || order.orderId || `MWOA-${Date.now().toString().slice(-6)}`;
  const status = order.status || "Pending";

  const destCountry =
    order.country_delivery || order.countryDelivery ||
    order.country_residence || order.countryResidence || "";
  const priceInfo = calculatePrice(order.qty, destCountry, true);
  const priceVal = order.price || priceInfo.formattedTotal;

  const record = {
    id: orderId,
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    name: order.name || "",
    grams: order.qty != null && order.qty !== "" ? Number(order.qty) : null,
    price: priceVal,
    email: order.email || "",
    phone: order.phone || "",
    country_residence: order.country_residence || order.countryResidence || "",
    country_delivery: order.country_delivery || order.countryDelivery || "",
    source,
    status,
  };

  try {
    // upsert on the primary key so a retried insert is idempotent.
    const res = await fetch(`${url}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: restHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[Supabase Insert] Failed:", res.status, detail);
      return { ok: false, error: `supabase_insert_${res.status}` };
    }
    console.log(`[Supabase] Order ${orderId} inserted`);
    return { ok: true, orderId };
  } catch (err) {
    console.error("[Supabase Insert Error]:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * READ all orders and serialise them to the app's CSV string format
 * (header + one line per row, oldest first — parseOrdersFromCsv reverses it
 * to newest-first, matching the CSV backend).
 * @returns {Promise<string>} CSV text (with BOM), or null on failure.
 */
export async function sbReadOrdersCsv() {
  const { url } = getSupabaseConfig();
  try {
    const res = await fetch(
      `${url}/rest/v1/${TABLE}?select=*&order=created_at.asc.nullslast,date.asc,time.asc`,
      { headers: restHeaders({ Accept: "application/json" }) }
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error("[Supabase Read] Failed:", res.status, detail);
      return null;
    }
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const body = rows.map(rowToCsvLine).join("\n");
    return "\uFEFF" + CSV_HEADER + (body ? body + "\n" : "");
  } catch (err) {
    console.error("[Supabase Read Error]:", err.message);
    return null;
  }
}

/**
 * UPDATE an order's status. Locks the settled price when Paid or Shipped,
 * exactly like the CSV backend's updateOrderStatus.
 * @returns {Promise<{ok: boolean, orderId?: string, status?: string, error?: string}>}
 */
export async function sbUpdateStatus(orderId, newStatus, lockedPrice = null) {
  const { url } = getSupabaseConfig();
  try {
    const patch = { status: newStatus };

    if (newStatus === "Paid" || newStatus === "Shipped") {
      if (lockedPrice) {
        patch.price = lockedPrice;
      } else {
        // Only compute a price when the row doesn't already carry one.
        const getRes = await fetch(
          `${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(orderId)}&select=price,grams,country_delivery,country_residence`,
          { headers: restHeaders({ Accept: "application/json" }) }
        );
        if (getRes.ok) {
          const [current] = await getRes.json();
          if (current && (!current.price || current.price === "—")) {
            const qty = Number(current.grams) || 0;
            const country = current.country_delivery || current.country_residence || "";
            patch.price = calculatePrice(qty, country, true).formattedTotal;
          }
        }
      }
    }

    const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: restHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[Supabase Update] Failed:", res.status, detail);
      return { ok: false, error: `supabase_update_${res.status}` };
    }
    const updated = await res.json();
    if (!Array.isArray(updated) || updated.length === 0) {
      return { ok: false, error: "order_not_found" };
    }
    return { ok: true, orderId, status: newStatus };
  } catch (err) {
    console.error("[Supabase Update Error]:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * DELETE an order by id.
 * @returns {Promise<{ok: boolean, orderId?: string, error?: string}>}
 */
export async function sbDeleteOrder(orderId) {
  const { url } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(orderId)}`, {
      method: "DELETE",
      headers: restHeaders({ Prefer: "return=representation" }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[Supabase Delete] Failed:", res.status, detail);
      return { ok: false, error: `supabase_delete_${res.status}` };
    }
    const deleted = await res.json();
    if (!Array.isArray(deleted) || deleted.length === 0) {
      return { ok: false, error: "order_not_found" };
    }
    return { ok: true, orderId };
  } catch (err) {
    console.error("[Supabase Delete Error]:", err.message);
    return { ok: false, error: err.message };
  }
}
