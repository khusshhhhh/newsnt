-- Captures footer newsletter signups. Previously the footer form only
-- showed a toast and discarded the email — this actually persists it.

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  department text,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers drop constraint if exists newsletter_subscribers_department_check;
alter table newsletter_subscribers add constraint newsletter_subscribers_department_check
  check (department is null or department in ('sanitary-tapware', 'door-hardware'));

alter table newsletter_subscribers enable row level security;

-- Visitors can add themselves but can never read the list back (prevents
-- scraping the subscriber list through the anon key).
create policy "anon insert newsletter signup"
  on newsletter_subscribers for insert
  to anon
  with check (true);

create policy "authenticated read newsletter signups"
  on newsletter_subscribers for select
  to authenticated
  using (true);
