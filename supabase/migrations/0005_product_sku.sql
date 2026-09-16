-- Optional SKU/product code, set from the admin product form and shown on
-- the product detail page. Nullable (existing products have none yet);
-- unique per department when set, since the two catalogs are independent.

alter table products add column if not exists sku text;

create unique index if not exists products_department_sku_key
  on products (department, sku)
  where sku is not null;
