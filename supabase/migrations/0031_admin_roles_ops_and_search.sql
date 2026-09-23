-- A grab-bag of backend improvements that the admin panel and storefront
-- build on. Each section is independent and idempotent.
--
--   1. Admin roles (owner / editor / sales), enforced in the database too
--   2. Indexes for the admin list filters and sorts
--   3. admin_dashboard_stats() — one round trip instead of ~11 count queries
--   4. Quote expiry, reminders and versions
--   5. Order payment and fulfilment fields
--   6. Soft delete (trash) for products, series and customers
--   7. Inquiry email-notification tracking (for retries)
--   8. Richer activity log (actor id + before/after changes)
--   9. error_events — server errors captured by instrumentation.ts
--  10. Typo-tolerant product search (pg_trgm)
--
-- Run after 0030_admin_mfa_enforcement.sql.

---------------------------------------------------------------------------
-- 1. Admin roles
---------------------------------------------------------------------------
-- owner  — everything, including managing other admins (/admin/team)
-- editor — catalog + review/photo moderation
-- sales  — inquiries, customers, quotes, orders
-- Every existing admin becomes an owner, so nobody loses access.

alter table admins add column if not exists role text not null default 'owner';
alter table admins drop constraint if exists admins_role_check;
alter table admins add constraint admins_role_check check (role in ('owner', 'editor', 'sales'));
alter table admins add column if not exists last_sign_in_at timestamptz;

create or replace function admin_has_scope(p_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_mfa_admin() and exists (
    select 1 from admins a
    where a.user_id = auth.uid()
      and (
        a.role = 'owner'
        or (p_scope = 'catalog' and a.role = 'editor')
        or (p_scope = 'moderation' and a.role = 'editor')
        or (p_scope = 'sales' and a.role = 'sales')
      )
  );
$$;

revoke all on function admin_has_scope(text) from public;
grant execute on function admin_has_scope(text) to authenticated, service_role;

-- Restrictive per-scope write gates, layered on top of 0030's MFA gate.
-- Catalog and moderation tables stay readable by every admin (the quote
-- builder needs products; everyone sees the dashboard) — only writes are
-- scoped. Sales/CRM data is scoped for reads too.
do $$
declare
  t text;
  cmd text;
begin
  foreach t in array array[
    'series', 'series_images', 'categories', 'category_images', 'products', 'product_images',
    'product_variants', 'product_resources', 'finishes'
  ] loop
    foreach cmd in array array['insert', 'update', 'delete'] loop
      execute format('drop policy if exists "catalog scope %s" on public.%I', cmd, t);
      if cmd = 'insert' then
        execute format('create policy "catalog scope %s" on public.%I as restrictive for insert to authenticated with check (admin_has_scope(''catalog''))', cmd, t);
      else
        execute format('create policy "catalog scope %s" on public.%I as restrictive for %s to authenticated using (admin_has_scope(''catalog''))', cmd, t, cmd);
      end if;
    end loop;
  end loop;

  foreach t in array array['reviews', 'project_photos'] loop
    foreach cmd in array array['update', 'delete'] loop
      execute format('drop policy if exists "moderation scope %s" on public.%I', cmd, t);
      execute format('create policy "moderation scope %s" on public.%I as restrictive for %s to authenticated using (admin_has_scope(''moderation''))', cmd, t, cmd);
    end loop;
  end loop;

  foreach t in array array['inquiries', 'customers', 'customer_notes', 'quotes', 'orders', 'newsletter_subscribers'] loop
    execute format('drop policy if exists "sales scope" on public.%I', t);
    execute format('create policy "sales scope" on public.%I as restrictive for all to authenticated using (admin_has_scope(''sales'')) with check (admin_has_scope(''sales''))', t);
  end loop;
end;
$$;

-- Catalog files (product photos, spec sheets) follow the catalog scope.
-- Project-photo submissions are uploaded by anon, so this only narrows admins.
drop policy if exists "catalog scope storage writes" on storage.objects;
create policy "catalog scope storage writes"
  on storage.objects as restrictive for insert
  to authenticated
  with check (bucket_id not in ('media', 'documents') or admin_has_scope('catalog'));

drop policy if exists "catalog scope storage deletes" on storage.objects;
create policy "catalog scope storage deletes"
  on storage.objects as restrictive for delete
  to authenticated
  using (bucket_id not in ('media', 'documents') or admin_has_scope('catalog') or admin_has_scope('moderation'));

---------------------------------------------------------------------------
-- 2. Indexes
---------------------------------------------------------------------------
create index if not exists inquiries_status_created_idx on inquiries (status, created_at desc) where deleted_at is null;
create index if not exists inquiries_created_at_idx on inquiries (created_at desc);
create index if not exists reviews_status_created_idx on reviews (status, created_at desc);
create index if not exists reviews_product_status_idx on reviews (product_id, status);
create index if not exists project_photos_status_created_idx on project_photos (status, created_at desc);
create index if not exists activity_log_entity_created_idx on activity_log (entity_type, created_at desc);
create index if not exists activity_log_actor_created_idx on activity_log (actor_email, created_at desc);
create index if not exists quotes_sent_at_idx on quotes (sent_at desc);
create index if not exists quotes_status_sent_idx on quotes (status, sent_at);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists products_dept_published_order_idx on products (department, is_published, display_order);
create index if not exists products_created_at_idx on products (created_at desc);
create index if not exists products_category_idx on products (category_id);
create index if not exists products_series_idx on products (series_id);
create index if not exists product_variants_product_idx on product_variants (product_id);
create index if not exists product_variants_color_idx on product_variants (color_name);
create index if not exists product_images_product_idx on product_images (product_id, display_order);
create index if not exists newsletter_subscribers_created_idx on newsletter_subscribers (created_at desc);

---------------------------------------------------------------------------
-- 4. Quote expiry, reminders, versions
---------------------------------------------------------------------------
alter table quotes add column if not exists expires_at timestamptz;
alter table quotes alter column expires_at set default (now() + interval '30 days');
update quotes set expires_at = sent_at + interval '30 days' where expires_at is null;
alter table quotes add column if not exists reminder_sent_at timestamptz;
alter table quotes add column if not exists version int not null default 1;
alter table quotes add column if not exists parent_quote_id uuid references quotes(id) on delete set null;
create index if not exists quotes_parent_idx on quotes (parent_quote_id);

-- 0026 only let admins insert quotes; reminders need to stamp reminder_sent_at.
drop policy if exists "admins update quotes" on quotes;
create policy "admins update quotes"
  on quotes for update
  to authenticated
  using (is_mfa_admin())
  with check (is_mfa_admin());

-- dispatchQuote() deletes the row it just inserted when the email fails,
-- but no delete policy ever existed — so those rows silently stayed behind
-- as "sent" quotes the customer never received.
drop policy if exists "admins delete quotes" on quotes;
create policy "admins delete quotes"
  on quotes for delete
  to authenticated
  using (is_mfa_admin());

-- get_quote_by_token now also returns expires_at, so the public page can
-- show "this quote has expired" instead of accept/decline buttons.
drop function if exists get_quote_by_token(text);
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
  select q.quote_number, q.items, q.notes, q.total, q.status, q.department, q.sent_at, q.responded_at,
         q.expires_at, c.name, c.email
  from quotes q
  join customers c on c.id = q.customer_id
  where q.accept_token = p_token;
end;
$$;

revoke all on function get_quote_by_token(text) from public;
grant execute on function get_quote_by_token(text) to anon, authenticated;

-- An expired quote can no longer be accepted or declined.
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

  if v_id is not null then
    insert into activity_log (actor_email, action, entity_type, entity_id, entity_name)
    select c.email, 'update', 'quote', q.id, 'Customer ' || p_status || ' quote ' || q.quote_number
    from quotes q join customers c on c.id = q.customer_id
    where q.id = v_id;
  end if;

  return v_id is not null;
end;
$$;

revoke all on function respond_to_quote(text, text) from public;
grant execute on function respond_to_quote(text, text) to anon, authenticated;

---------------------------------------------------------------------------
-- 5. Orders: payment + fulfilment
---------------------------------------------------------------------------
alter table orders add column if not exists total numeric;
alter table orders add column if not exists payment_status text not null default 'unpaid';
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'deposit_paid', 'paid', 'refunded'));
alter table orders add column if not exists deposit_amount numeric;
alter table orders add column if not exists amount_paid numeric not null default 0;
alter table orders add column if not exists fulfilment_date date;

update orders o
set total = coalesce(
  (select sum(coalesce((item ->> 'unitPrice')::numeric, 0) * coalesce((item ->> 'quantity')::int, 0))
   from jsonb_array_elements(o.items) item),
  0)
where total is null;

---------------------------------------------------------------------------
-- 6. Soft delete (trash) for products, series, customers
---------------------------------------------------------------------------
-- "Delete" moves to trash; the public read policies already hide
-- unpublished rows, and trashing also unpublishes, so nothing trashed ever
-- shows on the storefront.
alter table products add column if not exists deleted_at timestamptz;
alter table series add column if not exists deleted_at timestamptz;
alter table customers add column if not exists deleted_at timestamptz;
create index if not exists products_deleted_at_idx on products (deleted_at);
create index if not exists series_deleted_at_idx on series (deleted_at);
create index if not exists customers_deleted_at_idx on customers (deleted_at);

---------------------------------------------------------------------------
-- 7. Inquiry notification tracking
---------------------------------------------------------------------------
alter table inquiries add column if not exists notified_at timestamptz;
alter table inquiries add column if not exists notify_error text;
alter table inquiries add column if not exists customer_notified_at timestamptz;
create index if not exists inquiries_notify_error_idx on inquiries (created_at desc) where notify_error is not null and notified_at is null;

-- The public form inserts with the anon key and then records whether the
-- staff notification email went out. Anon can't update inquiries directly,
-- so this narrow SECURITY DEFINER function does it — only on a row created
-- in the last few minutes, so it can't be used to tamper with old leads.
create or replace function record_inquiry_notification(p_id uuid, p_error text, p_customer_notified boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update inquiries
    set notified_at = case when p_error is null then now() else notified_at end,
        notify_error = p_error,
        customer_notified_at = case when p_customer_notified then now() else customer_notified_at end
    where id = p_id and created_at > now() - interval '10 minutes';
$$;

revoke all on function record_inquiry_notification(uuid, text, boolean) from public;
grant execute on function record_inquiry_notification(uuid, text, boolean) to anon, authenticated;

-- 0019's anon insert policy doesn't allow reading the row back, so the form
-- can't learn the new inquiry's id with `.select()`. This wraps the insert
-- and returns the id.
create or replace function submit_inquiry(
  p_department text,
  p_product_ids uuid[],
  p_items jsonb,
  p_customer_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_department not in ('sanitary-tapware', 'door-hardware') then
    raise exception 'invalid department';
  end if;
  insert into inquiries (department, product_ids, items, customer_id, name, email, phone, message)
  values (p_department, p_product_ids, p_items, p_customer_id, p_name, lower(p_email), p_phone, p_message)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function submit_inquiry(text, uuid[], jsonb, uuid, text, text, text, text) from public;
grant execute on function submit_inquiry(text, uuid[], jsonb, uuid, text, text, text, text) to anon, authenticated;

---------------------------------------------------------------------------
-- 8. Activity log: who, and what changed
---------------------------------------------------------------------------
alter table activity_log add column if not exists actor_id uuid;
alter table activity_log add column if not exists changes jsonb;

alter table activity_log drop constraint if exists activity_log_entity_type_check;
alter table activity_log add constraint activity_log_entity_type_check
  check (entity_type in (
    'product', 'series', 'category', 'inquiry', 'review', 'project_photo', 'finish',
    'customer', 'customer_note', 'quote', 'order', 'admin'
  ));

alter table activity_log drop constraint if exists activity_log_action_check;
alter table activity_log add constraint activity_log_action_check
  check (action in ('create', 'update', 'delete', 'restore'));

---------------------------------------------------------------------------
-- 9. error_events
---------------------------------------------------------------------------
create table if not exists error_events (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  digest text,
  path text,
  method text,
  route_type text,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_at_idx on error_events (created_at desc);

alter table error_events enable row level security;

-- Written by the service role from instrumentation.ts; read by admins.
drop policy if exists "admins read error events" on error_events;
create policy "admins read error events"
  on error_events for select
  to authenticated
  using (is_mfa_admin());

drop policy if exists "admins delete error events" on error_events;
create policy "admins delete error events"
  on error_events for delete
  to authenticated
  using (is_mfa_admin());

drop policy if exists "require admin mfa" on error_events;
create policy "require admin mfa"
  on error_events as restrictive for all
  to authenticated
  using (is_mfa_admin())
  with check (is_mfa_admin());

---------------------------------------------------------------------------
-- 10. Typo-tolerant product search
---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index if not exists products_name_trgm_idx on products using gin (name extensions.gin_trgm_ops);
create index if not exists products_sku_trgm_idx on products using gin (sku extensions.gin_trgm_ops);

-- Published products in a department whose name/SKU contains the term, or
-- is a close fuzzy match for it ("mixr" → "Mixer"). Best matches first.
-- SECURITY INVOKER, so the anon role's published-only RLS still applies.
create or replace function search_product_ids(p_department text, p_query text, p_limit int default 200)
returns table (id uuid, score real)
language sql
stable
set search_path = public, extensions
as $$
  select p.id,
         greatest(
           extensions.word_similarity(p_query, p.name),
           extensions.word_similarity(p_query, coalesce(p.sku, '')),
           case when p.name ilike '%' || p_query || '%' or p.sku ilike '%' || p_query || '%' then 1 else 0 end
         )::real as score
  from products p
  where p.department = p_department
    and p.is_published
    and p.deleted_at is null
    and (
      p.name ilike '%' || p_query || '%'
      or p.sku ilike '%' || p_query || '%'
      or extensions.word_similarity(p_query, p.name) > 0.35
      or extensions.word_similarity(p_query, coalesce(p.sku, '')) > 0.5
    )
  order by score desc, p.display_order
  limit p_limit;
$$;

grant execute on function search_product_ids(text, text, int) to anon, authenticated;

---------------------------------------------------------------------------
-- 3. Dashboard stats in one call (last: it reads columns added above)
---------------------------------------------------------------------------
-- SECURITY INVOKER (the default): runs under the caller's RLS, so it only
-- ever returns numbers an MFA-verified admin could have counted anyway.
create or replace function admin_dashboard_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'series', (select count(*) from series where deleted_at is null),
    'categories', (select count(*) from categories),
    'products', (select count(*) from products where deleted_at is null),
    'drafts', (select count(*) from products where deleted_at is null and not is_published),
    'products_by_department', (
      select coalesce(jsonb_object_agg(department, n), '{}'::jsonb)
      from (select department, count(*) n from products where deleted_at is null group by department) d
    ),
    'new_inquiries', (select count(*) from inquiries where status = 'new' and deleted_at is null),
    'customers', (select count(*) from customers where deleted_at is null),
    'open_orders', (select count(*) from orders where status not in ('delivered', 'cancelled')),
    'pending_reviews', (select count(*) from reviews where status = 'pending'),
    'pending_photos', (select count(*) from project_photos where status = 'pending'),
    'quotes_awaiting_reply', (select count(*) from quotes where status = 'sent' and (expires_at is null or expires_at > now())),
    'quotes_needing_follow_up', (
      select count(*) from quotes
      where status = 'sent' and sent_at < now() - interval '7 days'
        and reminder_sent_at is null and (expires_at is null or expires_at > now())
    ),
    'failed_notifications', (select count(*) from inquiries where notify_error is not null and notified_at is null and deleted_at is null),
    'errors_24h', (select count(*) from error_events where created_at > now() - interval '24 hours')
  );
$$;
