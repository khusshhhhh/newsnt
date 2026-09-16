-- 0010_category_images.sql predates 0007_admin_roles.sql's tightened write
-- policies and was missed when writing it: it left category_images writable
-- by any authenticated Supabase user instead of just the `admins` allowlist.
-- Close that gap, matching every other catalog table (and series_images).

drop policy if exists "authenticated write category images" on category_images;

create policy "admins write category images"
  on category_images for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));
