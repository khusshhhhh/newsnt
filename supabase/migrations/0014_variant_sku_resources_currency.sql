-- Per-color SKUs, product resources (spec sheets/certifications), and a
-- currency lock to AUD.

-- Each color variant gets its own SKU, derived by the app from the
-- product's `sku` (now treated as the "SKU prefix") plus a 2-letter color
-- code, e.g. prefix "AKRLTS001" + Matte Black -> "AKRLTS001MB".
alter table product_variants add column if not exists sku text;

create unique index if not exists product_variants_product_id_sku_key
  on product_variants (product_id, sku)
  where sku is not null;

-- Downloadable resources (spec sheets, certifications, install guides...)
-- attached to a product, named freely by the admin.
create table if not exists product_resources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  storage_path text not null,
  file_name text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_resources_product_id_idx on product_resources (product_id);

alter table product_resources enable row level security;

drop policy if exists "public read resources of published products" on product_resources;
create policy "public read resources of published products"
  on product_resources for select
  to anon
  using (
    exists (
      select 1 from products
      where products.id = product_resources.product_id
      and products.is_published = true
    )
  );

drop policy if exists "authenticated read all resources" on product_resources;
create policy "authenticated read all resources"
  on product_resources for select
  to authenticated
  using (true);

drop policy if exists "authenticated write resources" on product_resources;
create policy "authenticated write resources"
  on product_resources for all
  to authenticated
  using (true)
  with check (true);

-- Storage bucket for product resource files (PDFs, docs, scanned certs) —
-- kept separate from `media` (0001_init.sql) since it needs document mime
-- types rather than image-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  26214400, -- 25 MB, matches the `media` bucket
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read documents bucket"
  on storage.objects for select
  to anon
  using (bucket_id = 'documents');

create policy "authenticated manage documents bucket"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

-- Currency lock: AUD everywhere, always. Existing rows are backfilled and a
-- check constraint stops any future write from setting anything else, as a
-- defense in depth alongside the app never sending another value.
alter table products alter column currency set default 'AUD';
update products set currency = 'AUD' where currency is distinct from 'AUD';
alter table products add constraint products_currency_aud_check check (currency = 'AUD');
