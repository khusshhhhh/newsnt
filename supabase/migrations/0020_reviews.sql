-- Customer product reviews, gated behind admin approval before they're
-- shown publicly (per the roadmap decision: "real reviews... upon approval
-- only from the admin panel").

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  reviewer_name text not null,
  reviewer_email text not null,
  rating int not null,
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table reviews drop constraint if exists reviews_rating_check;
alter table reviews add constraint reviews_rating_check check (rating between 1 and 5);

alter table reviews drop constraint if exists reviews_status_check;
alter table reviews add constraint reviews_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists reviews_product_id_idx on reviews (product_id);
create index if not exists reviews_status_idx on reviews (status);

alter table reviews enable row level security;

-- Anyone can submit a review (write-only — can't read back what they or
-- others submitted while pending, only what's already approved).
drop policy if exists "anon insert review" on reviews;
create policy "anon insert review"
  on reviews for insert
  to anon
  with check (status = 'pending');

drop policy if exists "public read approved reviews" on reviews;
create policy "public read approved reviews"
  on reviews for select
  to anon
  using (status = 'approved');

drop policy if exists "admins read all reviews" on reviews;
create policy "admins read all reviews"
  on reviews for select
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins moderate reviews" on reviews;
create policy "admins moderate reviews"
  on reviews for update
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy if exists "admins delete reviews" on reviews;
create policy "admins delete reviews"
  on reviews for delete
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));
