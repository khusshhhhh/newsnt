-- Stage 1 of the CRM build: a Customer record per distinct inquiry email
-- (auto-built/updated from inquiry submissions — no manual customer
-- creation), timestamped admin notes on each customer, persisted quotes
-- (previously ephemeral — generated and emailed but never recorded), and
-- an orders table for the "quote accepted -> fulfillment" pipeline that
-- Stage 2 builds the UI for. Also promotes `inquiries.status` from a flat
-- new/contacted/closed bucket into a proper deal pipeline.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers drop constraint if exists customers_department_check;
alter table customers add constraint customers_department_check
  check (department is null or department in ('sanitary-tapware', 'door-hardware'));

create index if not exists customers_updated_at_idx on customers (updated_at desc);

create table if not exists customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_id_idx
  on customer_notes (customer_id, created_at desc);

-- Upserts a customer by email and returns its id, called from the public
-- (anon) inquiry form — SECURITY DEFINER so a visitor can create/refresh
-- their own customer record by submitting an inquiry without needing a
-- broad RLS grant to write the customers table directly (which would let
-- anon overwrite *any* customer's row, not just their own).
create or replace function upsert_customer(
  p_email text,
  p_name text,
  p_phone text,
  p_department text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into customers (email, name, phone, department)
  values (lower(p_email), p_name, p_phone, p_department)
  on conflict (email) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, customers.phone),
        department = coalesce(excluded.department, customers.department),
        updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function upsert_customer(text, text, text, text) from public;
grant execute on function upsert_customer(text, text, text, text) to anon, authenticated;

-- Link inquiries to the customer they belong to.
alter table inquiries add column if not exists customer_id uuid references customers(id);
create index if not exists inquiries_customer_id_idx on inquiries (customer_id);

-- Backfill: one customer per distinct email seen across existing inquiries
-- (using each email's most recent inquiry as the current name/phone/
-- department snapshot), then link every inquiry back to its customer.
insert into customers (email, name, phone, department, created_at, updated_at)
select
  lower(i.email) as email,
  (array_agg(i.name order by i.created_at desc))[1] as name,
  (array_agg(i.phone order by i.created_at desc))[1] as phone,
  (array_agg(i.department order by i.created_at desc))[1] as department,
  min(i.created_at) as created_at,
  max(i.created_at) as updated_at
from inquiries i
group by lower(i.email)
on conflict (email) do nothing;

update inquiries
set customer_id = customers.id
from customers
where lower(inquiries.email) = customers.email
  and inquiries.customer_id is null;

-- Promote status from new/contacted/closed into a proper pipeline. "closed"
-- meant "no longer active" with no notion of outcome — the closest read of
-- that intent is "lost" (nothing came of it), so existing closed rows are
-- migrated there rather than left in a now-invalid state.
update inquiries set status = 'lost' where status = 'closed';

alter table inquiries drop constraint if exists inquiries_status_check;
alter table inquiries add constraint inquiries_status_check
  check (status in ('new', 'contacted', 'quoted', 'won', 'lost'));

-- Persisted quotes — previously a quote PDF was generated and emailed
-- without ever being recorded, so there was no way to see what was quoted
-- or re-send it later. One row per "Send quote" action.
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  inquiry_id uuid references inquiries(id) on delete set null,
  customer_id uuid not null references customers(id),
  items jsonb not null,
  notes text,
  total numeric,
  sent_at timestamptz not null default now()
);

create index if not exists quotes_customer_id_idx on quotes (customer_id, sent_at desc);
create index if not exists quotes_inquiry_id_idx on quotes (inquiry_id);

-- Fulfillment tracking once a quote is accepted. Deliberately has no
-- payment/invoicing fields — this tracks "what was ordered and where it's
-- up to", not money changing hands.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references customers(id),
  quote_id uuid references quotes(id) on delete set null,
  inquiry_id uuid references inquiries(id) on delete set null,
  department text not null,
  items jsonb not null,
  status text not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders drop constraint if exists orders_department_check;
alter table orders add constraint orders_department_check
  check (department in ('sanitary-tapware', 'door-hardware'));

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'));

create index if not exists orders_customer_id_idx on orders (customer_id, created_at desc);
create index if not exists orders_status_idx on orders (status);

-- RLS: customers/customer_notes/quotes/orders are all internal CRM data —
-- the anon role never reads or writes them directly (customer upserts go
-- through upsert_customer() above, which bypasses RLS as SECURITY DEFINER).
alter table customers enable row level security;

drop policy if exists "admins read customers" on customers;
create policy "admins read customers"
  on customers for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins update customers" on customers;
create policy "admins update customers"
  on customers for update
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

alter table customer_notes enable row level security;

drop policy if exists "admins read customer notes" on customer_notes;
create policy "admins read customer notes"
  on customer_notes for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins insert customer notes" on customer_notes;
create policy "admins insert customer notes"
  on customer_notes for insert
  to authenticated
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins delete customer notes" on customer_notes;
create policy "admins delete customer notes"
  on customer_notes for delete
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

alter table quotes enable row level security;

drop policy if exists "admins read quotes" on quotes;
create policy "admins read quotes"
  on quotes for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins insert quotes" on quotes;
create policy "admins insert quotes"
  on quotes for insert
  to authenticated
  with check (exists (select 1 from admins where user_id = auth.uid()));

alter table orders enable row level security;

drop policy if exists "admins read orders" on orders;
create policy "admins read orders"
  on orders for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins insert orders" on orders;
create policy "admins insert orders"
  on orders for insert
  to authenticated
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins update orders" on orders;
create policy "admins update orders"
  on orders for update
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

-- Widen the audit trail (0008/0023) to cover the new CRM entities.
alter table activity_log drop constraint if exists activity_log_entity_type_check;
alter table activity_log add constraint activity_log_entity_type_check
  check (entity_type in (
    'product', 'series', 'category', 'inquiry', 'review', 'project_photo', 'finish',
    'customer', 'customer_note', 'quote', 'order'
  ));
