-- Real installation/project photos submitted by customers, gated behind
-- admin approval before appearing in the public projects gallery. Reuses
-- the `media` storage bucket (0001_init.sql / 0009 / 0011) rather than a
-- new one, since these are still just images.

create table if not exists project_photos (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  series_id uuid references series(id) on delete set null,
  storage_path text not null,
  caption text,
  submitter_name text not null,
  submitter_email text not null,
  status text not null default 'pending',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table project_photos drop constraint if exists project_photos_department_check;
alter table project_photos add constraint project_photos_department_check
  check (department in ('sanitary-tapware', 'door-hardware'));

alter table project_photos drop constraint if exists project_photos_status_check;
alter table project_photos add constraint project_photos_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists project_photos_status_idx on project_photos (status);
create index if not exists project_photos_department_idx on project_photos (department);

alter table project_photos enable row level security;

drop policy if exists "anon insert project photo" on project_photos;
create policy "anon insert project photo"
  on project_photos for insert
  to anon
  with check (status = 'pending');

drop policy if exists "public read approved project photos" on project_photos;
create policy "public read approved project photos"
  on project_photos for select
  to anon
  using (status = 'approved');

drop policy if exists "admins read all project photos" on project_photos;
create policy "admins read all project photos"
  on project_photos for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins moderate project photos" on project_photos;
create policy "admins moderate project photos"
  on project_photos for update
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins delete project photos" on project_photos;
create policy "admins delete project photos"
  on project_photos for delete
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

-- The public submission form uploads its photo to Storage before inserting
-- the project_photos row (same client-upload-then-post-path pattern as the
-- admin image uploader). The `media` bucket is otherwise admins-only
-- (0007_admin_roles.sql), so this scopes anon writes to a dedicated
-- `project-submissions/` prefix only — it can't touch admin-managed product
-- or series/category photos.
drop policy if exists "anon upload project photo submissions" on storage.objects;
create policy "anon upload project photo submissions"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'project-submissions');

