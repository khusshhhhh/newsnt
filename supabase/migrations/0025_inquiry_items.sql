-- Structured line items for an inquiry/quote request. `product_ids` (see
-- 0019_inquiries.sql) only ever stored a bare product id repeated once per
-- unit, so it can't tell two variants of the same product apart — visible
-- in the admin panel as "Basin Mixer x 3" when a customer actually asked
-- for one colour x1 and another x2. `items` carries that detail so the
-- admin panel (and quote PDFs) can show accurate SKUs/quantities per line.
-- `product_ids` is still written alongside it for anything that hasn't
-- been migrated to read `items` yet.
alter table inquiries add column if not exists items jsonb;

comment on column inquiries.items is
  'Array of {product_id, variant_id, quantity}. Null for rows submitted before this column existed, or general contact enquiries with no products attached.';
