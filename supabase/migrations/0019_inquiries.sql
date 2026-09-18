-- Captures "Enquire" submissions and quote-basket requests server-side.
-- Previously "Enquire" was a client-only mailto: link with no record kept —
-- this is the first time a lead exists anywhere the admin panel can see it.
-- `product_ids` holds one id for a single-product enquiry, several for a
-- quote-basket request, or is left null for a general contact enquiry.

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  product_ids uuid[],
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table inquiries drop constraint if exists inquiries_department_check;
alter table inquiries add constraint inquiries_department_check
  check (department in ('sanitary-tapware', 'door-hardware'));

alter table inquiries drop constraint if exists inquiries_status_check;
alter table inquiries add constraint inquiries_status_check
  check (status in ('new', 'contacted', 'closed'));

create index if not exists inquiries_status_idx on inquiries (status);
create index if not exists inquiries_created_at_idx on inquiries (created_at desc);

alter table inquiries enable row level security;

-- Anyone can submit an inquiry, but never read the list back (same pattern
-- as newsletter_subscribers — prevents scraping contact details via the
-- anon key).
drop policy if exists "anon insert inquiry" on inquiries;
create policy "anon insert inquiry"
  on inquiries for insert
  to anon
  with check (true);

drop policy if exists "admins read inquiries" on inquiries;
create policy "admins read inquiries"
  on inquiries for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins update inquiries" on inquiries;
create policy "admins update inquiries"
  on inquiries for update
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));
