-- Restricts catalog writes to an explicit allowlist of admins instead of
-- "any authenticated Supabase user" (the policies from 0001/0003, which
-- README already flagged as a known gap now that there's more than one
-- person able to sign in).
--
-- IMPORTANT — run this LAST, after adding yourself to `admins`:
--   insert into admins (user_id)
--   select id from auth.users where email = 'you@example.com';
-- Otherwise nobody will be able to write to the catalog until you do.

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

drop policy if exists "admins read own membership" on admins;
create policy "admins read own membership"
  on admins for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "authenticated write series" on series;
create policy "admins write series"
  on series for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "authenticated write categories" on categories;
create policy "admins write categories"
  on categories for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "authenticated write products" on products;
create policy "admins write products"
  on products for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "authenticated write product images" on product_images;
create policy "admins write product images"
  on product_images for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "authenticated write variants" on product_variants;
create policy "admins write variants"
  on product_variants for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "authenticated manage media bucket" on storage.objects;
create policy "admins manage media bucket"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'media' and exists (select 1 from admins where user_id = auth.uid()))
  with check (bucket_id = 'media' and exists (select 1 from admins where user_id = auth.uid()));
