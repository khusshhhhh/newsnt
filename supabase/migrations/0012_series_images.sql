-- Series hero image galleries: up to 6 images per series, shown as an
-- auto-advancing slider at the top of the public series page. The first
-- image doubles as `series.hero_image_url` (kept in sync by upsertSeries),
-- which is what the homepage series carousel and Open Graph tags still use.

create table if not exists series_images (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists series_images_series_id_idx on series_images (series_id);

alter table series_images enable row level security;

-- Gated by the parent series' publish state, matching product_images'
-- pattern (categories have no publish flag, so category_images reads are
-- unconditional instead).
create policy "public read images of published series"
  on series_images for select
  to anon
  using (
    exists (
      select 1 from series
      where series.id = series_images.series_id
      and series.is_published = true
    )
  );

create policy "authenticated read all series images"
  on series_images for select
  to authenticated
  using (true);

-- Admin-gated (not just "authenticated"), matching 0007_admin_roles.sql's
-- tightened write policies for every other catalog table.
create policy "admins write series images"
  on series_images for all
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));
