-- Category image galleries: up to 6 images per category, shown as an
-- auto-advancing slider on the public series page.

create table if not exists category_images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists category_images_category_id_idx on category_images (category_id);

alter table category_images enable row level security;

create policy "public read category images"
  on category_images for select
  to anon
  using (true);

create policy "authenticated read all category images"
  on category_images for select
  to authenticated
  using (true);

create policy "authenticated write category images"
  on category_images for all
  to authenticated
  using (true)
  with check (true);
