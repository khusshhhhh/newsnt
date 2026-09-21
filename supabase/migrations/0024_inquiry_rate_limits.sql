-- Server-side backing store for inquiry submission rate limiting. The app
-- previously only tracked this in a cookie, which anyone can clear to get a
-- fresh limit — this table plus the check_inquiry_rate_limit() function
-- below let submitInquiry() enforce the cap per client IP on the server,
-- where it can't be bypassed from the browser.

create table if not exists inquiry_rate_limits (
  id bigint generated always as identity primary key,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists inquiry_rate_limits_identifier_created_at_idx
  on inquiry_rate_limits (identifier, created_at desc);

-- RLS is enabled with no policies at all — the anon key can neither read
-- nor write this table directly. The only way in is the function below,
-- which runs as its (table-owning) creator and so bypasses RLS.
alter table inquiry_rate_limits enable row level security;

-- Atomically checks whether `p_identifier` is still under `p_max_count`
-- submissions in the trailing `p_window_seconds`, and if so records this
-- attempt. Returns false when the caller should be rejected as rate
-- limited. Also opportunistically prunes that identifier's rows outside
-- the window so the table doesn't grow unbounded.
create or replace function check_inquiry_rate_limit(
  p_identifier text,
  p_max_count int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from inquiry_rate_limits
  where identifier = p_identifier
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from inquiry_rate_limits
  where identifier = p_identifier
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max_count then
    return false;
  end if;

  insert into inquiry_rate_limits (identifier) values (p_identifier);
  return true;
end;
$$;

revoke all on function check_inquiry_rate_limit(text, int, int) from public;
grant execute on function check_inquiry_rate_limit(text, int, int) to anon, authenticated;
