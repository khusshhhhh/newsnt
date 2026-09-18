-- 0014_variant_sku_resources_currency.sql added `product_resources` and the
-- `documents` storage bucket with "any authenticated user can write" policies
-- — the same gap 0007_admin_roles.sql closed for every other catalog table,
-- just missed here since this table didn't exist yet at that point. Brings
-- both in line with the `admins`-only write pattern everywhere else.

drop policy if exists "authenticated write resources" on product_resources;
create policy "admins write resources"
  on product_resources for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "authenticated manage documents bucket" on storage.objects;
create policy "admins manage documents bucket"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documents' and exists (select 1 from admins where user_id = auth.uid()))
  with check (bucket_id = 'documents' and exists (select 1 from admins where user_id = auth.uid()));
