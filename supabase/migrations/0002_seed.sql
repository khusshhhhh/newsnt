-- Optional sample data so the storefront isn't empty on first run.
-- Safe to skip; delete these rows from the admin panel once real products are loaded.

insert into categories (name, slug, display_order) values
  ('Basin Mixers', 'basin-mixers', 1),
  ('Kitchen Mixers', 'kitchen-mixers', 2),
  ('Taps', 'taps', 3),
  ('Showers', 'showers', 4)
on conflict (slug) do nothing;

insert into series (name, slug, design_story, display_order) values
  ('Series 1', 'series-1', 'A study in restraint: soft edges and a low profile.', 1),
  ('Series 2', 'series-2', 'Sharper lines, a more architectural stance.', 2)
on conflict (slug) do nothing;
