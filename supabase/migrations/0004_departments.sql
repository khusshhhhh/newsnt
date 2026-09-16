-- Splits the catalog into two independent departments/verticals:
--   'sanitary-tapware' — the existing basin mixers / kitchen mixers / taps / showers catalog
--   'door-hardware'    — a new line: door handles, hinges, locks, cabinet hardware...
--
-- Every series and category now belongs to exactly one department, and each
-- product denormalizes its category's department onto products.department
-- so the whole site can filter by department with a single indexed column
-- instead of a join everywhere. The app layer (not a trigger) keeps
-- products.department in sync with its category — see upsertProduct in
-- src/app/admin/actions.ts.

alter table categories add column if not exists department text;
alter table series add column if not exists department text;
alter table products add column if not exists department text;

update categories set department = 'sanitary-tapware' where department is null;
update series set department = 'sanitary-tapware' where department is null;
update products p set department = c.department
  from categories c where c.id = p.category_id and p.department is null;

alter table categories alter column department set not null;
alter table series alter column department set not null;
alter table products alter column department set not null;

alter table categories drop constraint if exists categories_department_check;
alter table categories add constraint categories_department_check
  check (department in ('sanitary-tapware', 'door-hardware'));

alter table series drop constraint if exists series_department_check;
alter table series add constraint series_department_check
  check (department in ('sanitary-tapware', 'door-hardware'));

alter table products drop constraint if exists products_department_check;
alter table products add constraint products_department_check
  check (department in ('sanitary-tapware', 'door-hardware'));

-- Slugs were globally unique; now they only need to be unique within a
-- department, since the two catalogs are independent taxonomies.
alter table categories drop constraint if exists categories_slug_key;
create unique index if not exists categories_department_slug_key on categories (department, slug);

alter table series drop constraint if exists series_slug_key;
create unique index if not exists series_department_slug_key on series (department, slug);

create index if not exists products_department_idx on products (department);
create index if not exists categories_department_idx on categories (department);
create index if not exists series_department_idx on series (department);

-- Starter taxonomy for the new department so it isn't empty on first load.
insert into categories (name, slug, department, display_order) values
  ('Door Handles', 'door-handles', 'door-hardware', 1),
  ('Pull Handles', 'pull-handles', 'door-hardware', 2),
  ('Hinges', 'hinges', 'door-hardware', 3),
  ('Locks & Latches', 'locks-latches', 'door-hardware', 4),
  ('Cabinet Hardware', 'cabinet-hardware', 'door-hardware', 5),
  ('Hooks & Accessories', 'hooks-accessories', 'door-hardware', 6)
on conflict (department, slug) do nothing;
