-- Per-color pricing: each product_variant can carry its own price, entered
-- when the color is added in the admin. products.price stays as the
-- fallback shown when a color has no price of its own, or when the product
-- has no colors yet.
alter table product_variants add column if not exists price numeric;

alter table product_variants
  drop constraint if exists product_variants_price_nonnegative_check;
alter table product_variants
  add constraint product_variants_price_nonnegative_check check (price is null or price >= 0);
