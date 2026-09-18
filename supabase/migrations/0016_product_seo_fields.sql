-- Optional per-product SEO overrides for the <title> and meta description
-- on its public product page. Both fall back to the product name / tagline
-- when left blank (see generateMetadata in the product page).
alter table products add column if not exists meta_title text;
alter table products add column if not exists meta_description text;
