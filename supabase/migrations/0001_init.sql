-- Aakar catalog schema: series x category -> products -> images
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  design_story text,
  hero_image_url text,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references series(id) on delete set null,
  category_id uuid not null references categories(id) on delete restrict,
  name text not null,
  slug text unique not null,
  price numeric,
  currency text not null default 'INR',
  description text,
  specs jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  display_order int not null default 0
);

create index if not exists products_series_id_idx on products (series_id);
create index if not exists products_category_id_idx on products (category_id);
create index if not exists products_is_published_idx on products (is_published);
create index if not exists product_images_product_id_idx on product_images (product_id);

-- Row Level Security: public (anon) can only read published rows.
-- Writes are only possible from an authenticated session (the admin panel).

alter table series enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;

create policy "public read published series"
  on series for select
  to anon
  using (is_published = true);

create policy "authenticated read all series"
  on series for select
  to authenticated
  using (true);

create policy "authenticated write series"
  on series for all
  to authenticated
  using (true)
  with check (true);

create policy "public read categories"
  on categories for select
  to anon
  using (true);

create policy "authenticated read all categories"
  on categories for select
  to authenticated
  using (true);

create policy "authenticated write categories"
  on categories for all
  to authenticated
  using (true)
  with check (true);

create policy "public read published products"
  on products for select
  to anon
  using (is_published = true);

create policy "authenticated read all products"
  on products for select
  to authenticated
  using (true);

create policy "authenticated write products"
  on products for all
  to authenticated
  using (true)
  with check (true);

create policy "public read product images of published products"
  on product_images for select
  to anon
  using (
    exists (
      select 1 from products
      where products.id = product_images.product_id
      and products.is_published = true
    )
  );

create policy "authenticated read all product images"
  on product_images for select
  to authenticated
  using (true);

create policy "authenticated write product images"
  on product_images for all
  to authenticated
  using (true)
  with check (true);

-- Storage bucket for all catalog imagery: product photos under products/,
-- series hero images under series/ (public read, authenticated write).

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media bucket" on storage.objects;
create policy "public read media bucket"
  on storage.objects for select
  to anon
  using (bucket_id = 'media');

drop policy if exists "authenticated manage media bucket" on storage.objects;
create policy "authenticated manage media bucket"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');
