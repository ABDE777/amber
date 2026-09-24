# Supabase compatibility & CRUD

This app (MWOA) stores **orders**. Historically that data lived in
`data/orders.csv` — written to the local disk in dev and to the GitHub repo (via
the Contents API) in production on Vercel. This document describes the optional
**Supabase** backend that now sits in front of that, and how every CRUD action
maps onto it.

## The data model

One entity: an **order**. Columns mirror `data/orders.csv` one-to-one:

| CSV header          | Supabase column      | Type          | Notes                              |
| ------------------- | -------------------- | ------------- | ---------------------------------- |
| `ID`                | `id`                 | `text` (PK)   | e.g. `MWOA-565659`                 |
| `Date`              | `date`               | `date`        |                                    |
| `Time`              | `time`               | `time`        |                                    |
| `Name`              | `name`               | `text`        | customer name                      |
| `Grams`             | `grams`              | `numeric`     | quantity ordered                   |
| `Price`             | `price`              | `text`        | formatted; **locked** on Paid/Shipped |
| `Email`             | `email`              | `text`        |                                    |
| `Phone`             | `phone`              | `text`        |                                    |
| `Country_Residence` | `country_residence`  | `text`        |                                    |
| `Country_Delivery`  | `country_delivery`   | `text`        |                                    |
| `Source`            | `source`             | `text`        | e.g. `Order Form`                  |
| `Status`            | `status`             | `text`        | `Pending` / `Paid` / `Shipped` / `Cancelled` |
| —                   | `created_at`         | `timestamptz` | ordering; defaults to `now()`      |

## CRUD map

| Action     | HTTP entry point                          | Storage function                     | Supabase (PostgREST)          |
| ---------- | ----------------------------------------- | ------------------------------------ | ----------------------------- |
| **Create** | `POST /api/order`                         | `saveOrderToCsv` → `sbInsertOrder`   | `POST /rest/v1/orders` (upsert on `id`) |
| **Read**   | `GET /api/orders` (`?format=json\|csv` or HTML dashboard) | `readOrdersCsvAsync` → `sbReadOrdersCsv` | `GET /rest/v1/orders?select=*` |
| **Update** | `POST` / `PATCH /api/orders` `{orderId,status}` | `updateOrderStatus` → `sbUpdateStatus` | `PATCH /rest/v1/orders?id=eq.…` |
| **Delete** | `DELETE /api/orders?id=…`                  | `deleteOrder` → `sbDeleteOrder`      | `DELETE /rest/v1/orders?id=eq.…` |

The read path serialises Supabase rows **back into the exact CSV string format**
the rest of the app already speaks, so `parseOrdersFromCsv`, the JSON API, the
CSV download, and the HTML analytics dashboard all keep working unchanged.

Price-locking behaviour is preserved: when an order moves to **Paid** or
**Shipped**, the settled price is frozen (an explicit `lockedPrice` wins;
otherwise it is computed once from grams × destination rate if not already set) —
identical to the CSV backend.

## How it turns on

The Supabase backend is **opt-in and automatic**. It activates only when both a
URL and a key are present in the environment:

```
SUPABASE_URL=https://jkmhofmohkzbkixisqqq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key from Project Settings → API>
```

- With both set → all CRUD goes to Supabase (with a safe fall-through to the
  CSV/GitHub backend if a Supabase call fails).
- With either missing → the app behaves exactly as before (CSV + GitHub).

The **service-role key is server-side only** — it bypasses Row Level Security
and must never be exposed to the browser or prefixed with `VITE_`. Set it in
Vercel → Project Settings → Environment Variables (and your local `.env`).
`SUPABASE_ANON_KEY` is accepted only as a read-mostly fallback.

## Setup (one time)

1. Open the project SQL editor:
   <https://supabase.com/dashboard/project/jkmhofmohkzbkixisqqq> → **SQL Editor**.
2. Paste and run [`supabase/migrations/0001_orders.sql`](supabase/migrations/0001_orders.sql).
   It creates `public.orders`, an index, enables RLS with **no public policies**
   (so the table is backend-only), and optionally seeds the current demo rows.
3. Copy **Project URL** and the **service_role** key from Project Settings → API
   into your env vars as above.
4. Redeploy / restart. Orders now persist in Supabase.

## Security notes

- RLS is enabled with no anon policy → the table cannot be read or written with
  the public key. Access is only through the serverless functions using the
  service-role key.
- The service-role key grants full DB access. Keep it out of the client bundle,
  out of git, and rotate it if it ever leaks (Project Settings → API → Reset).
