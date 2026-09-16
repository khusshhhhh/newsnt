-- Audit trail for admin writes. Since every admin shares one write policy
-- (see 0007_admin_roles.sql), this is the only record of who changed what.

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null check (action in ('create', 'update', 'delete')),
  entity_type text not null check (entity_type in ('product', 'series', 'category')),
  entity_id uuid,
  entity_name text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_at_idx on activity_log (created_at desc);

alter table activity_log enable row level security;

drop policy if exists "authenticated read activity log" on activity_log;
create policy "authenticated read activity log"
  on activity_log for select
  to authenticated
  using (true);

drop policy if exists "authenticated write activity log" on activity_log;
create policy "authenticated write activity log"
  on activity_log for insert
  to authenticated
  with check (true);
