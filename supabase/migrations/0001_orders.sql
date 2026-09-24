-- ---------------------------------------------------------------------------
-- MWOA — orders table
--
-- Run this once against the Supabase project (project jkmhofmohkzbkixisqqq):
--   Dashboard → SQL Editor → paste → Run
-- or with the Supabase CLI:  supabase db push
--
-- The columns mirror data/orders.csv one-to-one (snake_cased) so the app's CSV
-- backend and this table stay interchangeable. See lib/supabase_storage.js.
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id                 text primary key,          -- e.g. MWOA-565659
  date               date,
  time               time,
  name               text,
  grams              numeric,
  price              text,                       -- formatted, may be locked on Paid/Shipped
  email              text,
  phone              text,
  country_residence  text,
  country_delivery   text,
  source             text        default 'Order Form',
  status             text        default 'Pending',
  created_at         timestamptz default now()
);

-- Keep the dashboard's newest-first listing fast.
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Row Level Security: on, with NO public policies. The app talks to this table
-- from serverless functions using the SERVICE ROLE key, which bypasses RLS.
-- Because the anon/public key has no policy, the table is not readable or
-- writable from the browser — orders stay private to the backend.
alter table public.orders enable row level security;

-- ---------------------------------------------------------------------------
-- Optional: seed the seven demo rows currently in data/orders.csv.
-- Safe to re-run (on conflict do nothing). Delete this block for a clean start.
-- ---------------------------------------------------------------------------
insert into public.orders
  (id, date, time, name, grams, price, email, phone, country_residence, country_delivery, source, status)
values
  ('MWOA-565659','2026-09-01','22:42:45','DD 104',12345,'4,938,000 درهم مغربي','mazgouraabdalmounim@gmail.com','+212631883412','Morocco','Morocco','Order Form','Paid'),
  ('MWOA-295904','2026-09-01','23:38:15','Order Form Test',10,'4,000 درهم مغربي','test@gmail.com','+212631883412','Morocco','Morocco','Order Form','Pending'),
  ('MWOA-425546','2026-09-01','23:40:25','Real Order Form',12,'4,800 درهم مغربي','real@example.com','+212631883412','Morocco','Morocco','Order Form','Pending'),
  ('MWOA-885122','2026-09-01','22:48:05','pojp',88,'13,200 ريال سعودي','abdeljadmonim@gmail.com','+212631883412','المغرب','السعودية','Order Form','Pending'),
  ('MWOA-109876','2026-09-01','22:51:49','DD 104',12345,'4,938,000 درهم مغربي','mazgouraabdalmounim@gmail.com','+212631883412','Morocco','Morocco','Order Form','Pending'),
  ('MWOA-194230','2026-09-01','23:53:14','Customer With Stored Price',15,'2,250 ريال سعودي','customer@amber.com','+212631883412','المغرب','السعودية','Order Form','Pending'),
  ('MWOA-777355','2026-09-01','23:02:57','JPOJ',4,'645.6 ريال سعودي','mazgouraabdalmounim@gmail.com','+212631883412','المغرب','السعودية','Order Form','Paid')
on conflict (id) do nothing;
