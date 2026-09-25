-- Blurred loading previews are retired (see 0035): the app no longer
-- generates, stores or reads them. Drop the columns; their size-check
-- constraints go with them. Safe on either side of a deploy — the code that
-- wrote these columns already retried without them when they were missing.

alter table product_images drop column if exists blur_data_url;
alter table series_images drop column if exists blur_data_url;
alter table category_images drop column if exists blur_data_url;
alter table project_photos drop column if exists blur_data_url;
alter table series drop column if exists hero_blur_data_url;
