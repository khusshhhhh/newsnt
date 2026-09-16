-- Product color variants: a product available in multiple finishes/colors.
-- Each variant can carry its own photos via product_images.variant_id;
-- product_images with a null variant_id are the product's general/default gallery.

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_name text not null,
  color_hex text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on product_variants (product_id);

alter table product_images
  add column if not exists variant_id uuid references product_variants(id) on delete cascade;

create index if not exists product_images_variant_id_idx on product_images (variant_id);

alter table product_variants enable row level security;

drop policy if exists "public read variants of published products" on product_variants;
create policy "public read variants of published products"
  on product_variants for select
  to anon
  using (
    exists (
      select 1 from products
      where products.id = product_variants.product_id
      and products.is_published = true
    )
  );

drop policy if exists "authenticated read all variants" on product_variants;
create policy "authenticated read all variants"
  on product_variants for select
  to authenticated
  using (true);

drop policy if exists "authenticated write variants" on product_variants;
create policy "authenticated write variants"
  on product_variants for all
  to authenticated
  using (true)
  with check (true);
