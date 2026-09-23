-- Moves the admin second factor (emailed code, 0028) from "a cookie the Next.js
-- middleware checks" into the database itself. Before this, every admin RLS
-- policy only asked "is auth.uid() in `admins`?" — so a password-only session
-- (code never entered) could still call admin server actions, or the Supabase
-- REST/Storage API directly with its own session JWT, and read/write anything.
--
-- Now:
--   - verifyOtp() (server-side, service role) records the verified Supabase
--     session in `admin_mfa_sessions`, keyed by the JWT's `session_id` claim.
--   - is_mfa_admin() is true only for an admin whose *current* session has
--     such a row that hasn't expired.
--   - A RESTRICTIVE policy on every public table (and storage.objects) ANDs
--     is_mfa_admin() onto whatever the existing permissive policies allow for
--     the `authenticated` role. The anon role (public storefront, inquiry
--     form, quote accept page) is untouched — only signed-in sessions are
--     narrowed, and the only people who sign in are admins.
--   - OTP bookkeeping on `admins` moves to the service role, so the
--     self-update policy from 0028 (which let a password-only session reset
--     its own `otp_attempts` and brute-force the code) is dropped.
--
-- Requires SUPABASE_SERVICE_ROLE_KEY in the app's environment.
--
-- NOTE: the DO block at the bottom applies the restrictive policy to every
-- table that exists when this runs. A table added by a later migration needs
-- its own `create policy ... as restrictive ... using (is_mfa_admin())` — see
-- the ones at the end of 0031 for the pattern.

create table if not exists admin_mfa_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists admin_mfa_sessions_user_id_idx on admin_mfa_sessions (user_id);

-- No policies: only the service role (which bypasses RLS) reads or writes it.
alter table admin_mfa_sessions enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function is_mfa_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admins a
    join admin_mfa_sessions s on s.user_id = a.user_id
    where a.user_id = auth.uid()
      and s.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.expires_at > now()
  );
$$;

revoke all on function is_admin() from public;
revoke all on function is_mfa_admin() from public;
grant execute on function is_admin() to authenticated, service_role;
grant execute on function is_mfa_admin() to authenticated, service_role;

drop policy if exists "admins update own otp fields" on admins;

-- Restrictive MFA gate on every public table for the `authenticated` role.
-- `admins` itself is skipped (0007's "read own membership" stays usable so
-- the app can tell a password-only session it still needs its code), and so
-- is admin_mfa_sessions (no authenticated policies at all).
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('admins', 'admin_mfa_sessions')
  loop
    execute format('drop policy if exists "require admin mfa" on public.%I', t.tablename);
    execute format(
      'create policy "require admin mfa" on public.%I as restrictive for all to authenticated using (is_mfa_admin()) with check (is_mfa_admin())',
      t.tablename
    );
  end loop;
end;
$$;

drop policy if exists "require admin mfa" on storage.objects;
create policy "require admin mfa"
  on storage.objects as restrictive for all
  to authenticated
  using (is_mfa_admin())
  with check (is_mfa_admin());

-- Housekeeping: expired verified-session rows are useless; prune them.
create or replace function prune_admin_mfa_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  delete from admin_mfa_sessions where expires_at < now() - interval '1 day';
$$;

revoke all on function prune_admin_mfa_sessions() from public;
grant execute on function prune_admin_mfa_sessions() to service_role;
