-- Lightweight availability signal — not real inventory/quantity tracking,
-- since there's no checkout to reconcile stock counts against. Mirrors the
-- existing price-override pattern: a variant's stock_status (nullable)
-- overrides the product's when set, otherwise the product's status applies.

alter table products add column if not exists stock_status text not null default 'in_stock';
alter table products drop constraint if exists products_stock_status_check;
alter table products add constraint products_stock_status_check
  check (stock_status in ('in_stock', 'made_to_order', 'out_of_stock', 'discontinued'));

alter table product_variants add column if not exists stock_status text;
alter table product_variants drop constraint if exists product_variants_stock_status_check;
alter table product_variants add constraint product_variants_stock_status_check
  check (stock_status is null or stock_status in ('in_stock', 'made_to_order', 'out_of_stock', 'discontinued'));
