-- A tiny blurred preview of each photo (a ~16px image as a data: URL, a few
-- hundred bytes), shown while the real photo loads instead of a flat grey
-- box. New uploads get one generated in the browser at upload time; existing
-- rows are backfilled by `node scripts/optimize-media.mjs --apply`.
--
-- The app works either side of this migration (writes retry without these
-- columns, reads use `select *`), but previews are only saved once it's applied.

alter table product_images add column if not exists blur_data_url text;
alter table series_images add column if not exists blur_data_url text;
alter table category_images add column if not exists blur_data_url text;
alter table project_photos add column if not exists blur_data_url text;
-- Mirrors series.hero_image_url (the first gallery image), which is what
-- the carousel, nav and homepage read without loading the whole gallery.
alter table series add column if not exists hero_blur_data_url text;

-- project_photos rows come from the public submission form, so cap the size:
-- a real preview is well under 1 KB; nothing should park big blobs in a row.
alter table product_images
  add constraint product_images_blur_size check (blur_data_url is null or length(blur_data_url) <= 4000);
alter table series_images
  add constraint series_images_blur_size check (blur_data_url is null or length(blur_data_url) <= 4000);
alter table category_images
  add constraint category_images_blur_size check (blur_data_url is null or length(blur_data_url) <= 4000);
alter table project_photos
  add constraint project_photos_blur_size check (blur_data_url is null or length(blur_data_url) <= 4000);
alter table series
  add constraint series_hero_blur_size check (hero_blur_data_url is null or length(hero_blur_data_url) <= 4000);
