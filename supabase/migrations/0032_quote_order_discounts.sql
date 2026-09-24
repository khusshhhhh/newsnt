-- Discounts on quotes and orders. One discount per document, entered either
-- as a percentage of the subtotal or as a fixed dollar amount off it:
--   discount_type  'percent' | 'amount' (null = no discount)
--   discount_value the percentage (0–100) or the dollar amount
-- `total` stays the post-discount figure, so reports and lists that already
-- read `total` pick the discount up without any change.

alter table quotes add column if not exists discount_type text;
alter table quotes add column if not exists discount_value numeric;
alter table quotes drop constraint if exists quotes_discount_check;
alter table quotes add constraint quotes_discount_check check (
  (discount_type is null and discount_value is null)
  or (discount_type = 'percent' and discount_value > 0 and discount_value <= 100)
  or (discount_type = 'amount' and discount_value > 0)
);

alter table orders add column if not exists discount_type text;
alter table orders add column if not exists discount_value numeric;
alter table orders drop constraint if exists orders_discount_check;
alter table orders add constraint orders_discount_check check (
  (discount_type is null and discount_value is null)
  or (discount_type = 'percent' and discount_value > 0 and discount_value <= 100)
  or (discount_type = 'amount' and discount_value > 0)
);

-- The public quote page shows the subtotal, the discount and the total, so
-- get_quote_by_token also returns the discount columns now.
drop function if exists get_quote_by_token(text);
create or replace function get_quote_by_token(p_token text)
returns table (
  quote_number text,
  items jsonb,
  notes text,
  total numeric,
  discount_type text,
  discount_value numeric,
  status text,
  department text,
  sent_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  customer_name text,
  customer_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select q.quote_number, q.items, q.notes, q.total, q.discount_type, q.discount_value, q.status, q.department,
         q.sent_at, q.responded_at, q.expires_at, c.name, c.email
  from quotes q
  join customers c on c.id = q.customer_id
  where q.accept_token = p_token;
end;
$$;

revoke all on function get_quote_by_token(text) from public;
grant execute on function get_quote_by_token(text) to anon, authenticated;
