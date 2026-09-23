-- Turns `quotes` from "a record of what was sent" into a trackable
-- send -> accept/decline -> order pipeline:
--   - `status` + `responded_at` record the customer's decision.
--   - `accept_token` backs a public, unauthenticated `/quote/[token]` page
--     the customer clicks through from their email — no login, and only
--     the two RPCs below (SECURITY DEFINER, same pattern as
--     `upsert_customer` in 0026) ever touch `quotes` as anon.
--   - `department` lets a quote become an order (`createOrder`) without
--     needing an inquiry to source it from — quotes can now be built from
--     scratch in the admin panel, not just off an existing inquiry.

alter table quotes add column if not exists status text not null default 'sent';
alter table quotes drop constraint if exists quotes_status_check;
alter table quotes add constraint quotes_status_check check (status in ('sent', 'accepted', 'declined'));

alter table quotes add column if not exists responded_at timestamptz;

alter table quotes add column if not exists department text;
update quotes q set department = i.department from inquiries i where q.inquiry_id = i.id and q.department is null;
update quotes q set department = c.department from customers c where q.customer_id = c.id and q.department is null;
update quotes set department = 'sanitary-tapware' where department is null;
alter table quotes alter column department set not null;
alter table quotes drop constraint if exists quotes_department_check;
alter table quotes add constraint quotes_department_check check (department in ('sanitary-tapware', 'door-hardware'));

alter table quotes add column if not exists accept_token text;
alter table quotes alter column accept_token set default encode(gen_random_bytes(24), 'hex');
update quotes set accept_token = encode(gen_random_bytes(24), 'hex') where accept_token is null;
alter table quotes alter column accept_token set not null;
alter table quotes drop constraint if exists quotes_accept_token_key;
alter table quotes add constraint quotes_accept_token_key unique (accept_token);

create index if not exists quotes_status_idx on quotes (status);

-- Public read of one quote by its (unguessable) token — never a broad SELECT
-- grant on the table, which would let anon list every quote.
create or replace function get_quote_by_token(p_token text)
returns table (
  quote_number text,
  items jsonb,
  notes text,
  total numeric,
  status text,
  department text,
  sent_at timestamptz,
  responded_at timestamptz,
  customer_name text,
  customer_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select q.quote_number, q.items, q.notes, q.total, q.status, q.department, q.sent_at, q.responded_at,
         c.name, c.email
  from quotes q
  join customers c on c.id = q.customer_id
  where q.accept_token = p_token;
end;
$$;

revoke all on function get_quote_by_token(text) from public;
grant execute on function get_quote_by_token(text) to anon, authenticated;

-- Records the customer's decision. Only fires from the 'sent' state, so a
-- link can't be replayed to flip an already-decided quote back and forth.
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
    where accept_token = p_token and status = 'sent'
    returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function respond_to_quote(text, text) from public;
grant execute on function respond_to_quote(text, text) to anon, authenticated;
