-- The admin activity log has been retired: the app no longer writes to or
-- reads `activity_log`. This removes the one remaining writer on the
-- database side — respond_to_quote() used to record the customer's
-- accept/decline there. Behaviour is otherwise identical to 0031.
--
-- The `activity_log` table and its existing rows are left in place (nothing
-- reads them any more). To delete that history for good, run separately:
--   drop table if exists activity_log;

create or replace function respond_to_quote(p_token text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid status: %', p_status;
  end if;

  update quotes
    set status = p_status, responded_at = now()
    where accept_token = p_token
      and status = 'sent'
      and (expires_at is null or expires_at > now())
    returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function respond_to_quote(text, text) from public;
grant execute on function respond_to_quote(text, text) to anon, authenticated;
