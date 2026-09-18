-- Moves the color/finish palette from a hardcoded array (src/lib/colors.ts)
-- into an admin-managed table. The finish lineup changes roughly monthly, so
-- it needs to be editable from /admin/finishes without a code deploy.
-- Seeded with the 6 finishes that were previously hardcoded, so existing
-- product_variants.color_name values keep resolving to the same code/hex.

create table if not exists finishes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  hex text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table finishes enable row level security;

drop policy if exists "public read active finishes" on finishes;
create policy "public read active finishes"
  on finishes for select
  to anon
  using (is_active = true);

drop policy if exists "authenticated read all finishes" on finishes;
create policy "authenticated read all finishes"
  on finishes for select
  to authenticated
  using (true);

drop policy if exists "admins write finishes" on finishes;
create policy "admins write finishes"
  on finishes for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

insert into finishes (name, code, hex, display_order) values
  ('Matte Black', 'MB', '#1C1C1C', 1),
  ('Brushed Gold', 'BG', '#B08D57', 2),
  ('Brushed Bronze', 'BB', '#7C5A43', 3),
  ('Brushed Nickel', 'BN', '#9C9C94', 4),
  ('Satin Chrome', 'SC', '#C9CDD1', 5),
  ('Gun Metal', 'GM', '#3A3D40', 6)
on conflict (name) do nothing;
