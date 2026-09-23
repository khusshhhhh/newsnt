-- Email-OTP second factor for /admin sign-in: after password auth, a 6-digit
-- code is emailed and must be verified before the session is treated as
-- fully authenticated. One pending code per admin at a time, so it lives
-- directly on the `admins` row rather than a separate table.

alter table admins add column if not exists otp_code_hash text;
alter table admins add column if not exists otp_expires_at timestamptz;
alter table admins add column if not exists otp_attempts smallint not null default 0;

-- 0007 only granted admins SELECT on their own row — sign-in needs to write
-- its own otp_* fields too (store a pending code, clear it on success, bump
-- the attempt counter on a miss).
drop policy if exists "admins update own otp fields" on admins;
create policy "admins update own otp fields"
  on admins for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
