# Flow catalog

Next.js (App Router) storefront + admin panel for Flow's two product lines —
tapware/sanitaryware and door hardware — backed by Supabase (Postgres, Storage, Auth).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + TypeScript + Tailwind v4
- **Supabase**: Postgres for `series` / `categories` / `products` / `product_images` /
  `product_variants`, Storage for photography, Auth for the admin panel
- **shadcn/ui** (Base UI primitives) + `motion` for the admin forms and scroll animation
- Typography: [Fraunces](https://fonts.google.com/specimen/Fraunces) for headings, paired
  with [Geist](https://vercel.com/font) for body/UI text

## Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run the migrations in order:
   - [`0001_init.sql`](supabase/migrations/0001_init.sql) — schema, RLS policies, `media` storage bucket
   - [`0002_seed.sql`](supabase/migrations/0002_seed.sql) — optional sample categories/series
   - [`0003_product_variants.sql`](supabase/migrations/0003_product_variants.sql) — color/finish variants per product
   - [`0004_departments.sql`](supabase/migrations/0004_departments.sql) — splits the catalog into the two departments below
   - [`0005_product_sku.sql`](supabase/migrations/0005_product_sku.sql) — optional product SKU field
   - [`0006_newsletter_subscribers.sql`](supabase/migrations/0006_newsletter_subscribers.sql) — footer newsletter signups
   - [`0007_admin_roles.sql`](supabase/migrations/0007_admin_roles.sql) — restricts catalog writes to an
     `admins` allowlist instead of any authenticated user (see step 3 below — **run this last**)
   - [`0008_activity_log.sql`](supabase/migrations/0008_activity_log.sql) — audit trail for admin writes,
     viewable at `/admin/activity`
   - [`0009_media_bucket_limits.sql`](supabase/migrations/0009_media_bucket_limits.sql) — server-side file
     size/type limits on the `media` storage bucket
   - `0010`–`0016` — category/series photo galleries, per-color SKUs & pricing, product resources,
     and SEO fields (see each file's own header comment)
   - [`0017_fix_resources_rls.sql`](supabase/migrations/0017_fix_resources_rls.sql) — closes a write-RLS
     gap on `product_resources`/the `documents` bucket left over from `0014`
   - [`0018_finishes.sql`](supabase/migrations/0018_finishes.sql) — the color/finish palette, now an
     admin-managed table (`/admin/finishes`) instead of a hardcoded list
   - [`0019_inquiries.sql`](supabase/migrations/0019_inquiries.sql) — "Enquire" and quote-basket
     submissions, viewable at `/admin/inquiries`
   - [`0020_reviews.sql`](supabase/migrations/0020_reviews.sql) — customer product reviews, moderated
     at `/admin/reviews` before they show publicly
   - [`0021_project_photos.sql`](supabase/migrations/0021_project_photos.sql) — customer-submitted
     installation photos, moderated at `/admin/photos`, shown at `/[department]/projects` once approved
   - [`0022_stock_status.sql`](supabase/migrations/0022_stock_status.sql) — a lightweight
     in-stock/made-to-order/out-of-stock/discontinued flag per product and per color
   - [`0023_widen_activity_log.sql`](supabase/migrations/0023_widen_activity_log.sql) — extends the
     audit trail to cover the entities above
3. In Supabase → Authentication, create your own admin user (email + password), then add
   them to the `admins` table so `0007_admin_roles.sql`'s write policies let them in:
   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
   Do this **before or immediately after** running `0007_admin_roles.sql` — until an admin
   row exists, nobody (including a previously-working session) can write to the catalog.
4. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API), plus `NEXT_PUBLIC_SITE_URL` (used for the sitemap, robots.txt,
   and Open Graph image URLs). Two more are needed for the features added after `0016`:
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → `service_role` secret, **server-only**,
     never `NEXT_PUBLIC_`) — reserved for admin user-management; not required just to run the app.
   - `RESEND_API_KEY` + `EMAIL_FROM` + `INQUIRY_NOTIFICATION_EMAIL` (resend.com) — emails the team
     when a new inquiry comes in. Leave blank in development: emails are skipped with a console
     warning rather than failing, inquiries still save to the database either way.
5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

6. Sign in at [`/admin/login`](http://localhost:3000/admin/login) and start adding
   series, categories, and products.

## Data model

Every `series`, `category`, and `product` belongs to exactly one **department** —
`sanitary-tapware` or `door-hardware`. The two are entirely independent catalogs sharing
one schema and admin: a product belongs to one category and *optionally* one series
(`series_id` is nullable, so items with no series — most door hardware, for instance —
work fine). A product's `department` always mirrors its category's, kept in sync by
`upsertProduct` in [`actions.ts`](src/app/admin/actions.ts) rather than trusted from the form.

This lets the storefront browse "everything in Series 3", "every basin mixer across all
series" (`/[department]/category/[slug]`), or both together
(`/[department]/series/[slug]/[categorySlug]`) — see [`department.ts`](src/lib/department.ts)
for the slug/label helpers used everywhere instead of hardcoding paths.

Product `specs` (finish, material, dimensions, ...) are a free-form JSON key/value map,
edited as repeatable rows in the admin product form.

A product can also come in multiple colors/finishes via `product_variants`. Each variant
has a name and swatch hex, and can carry its own photos (`product_images.variant_id`) —
if a variant has no photos of its own, the product page falls back to the default
gallery. Managed from the "Colors" section on a product's admin edit page.

## Routes

- `/` — the gateway: pick Sanitary & Tapware or Door Hardware
- `/[department]`, `/[department]/series`, `/[department]/series/[seriesSlug]`,
  `/[department]/series/[seriesSlug]/[categorySlug]`, `/[department]/category/[categorySlug]`,
  `/[department]/product/[productSlug]` — public catalog, `department` is
  `sanitary-tapware` or `door-hardware`
- `/[department]/projects` — customer-submitted installation photos (approved ones only); has its
  own submission dialog
- `/admin` — dashboard (protected; redirects to `/admin/login` if signed out)
- `/admin/series`, `/admin/categories`, `/admin/products`, `/admin/finishes` — CRUD, each with
  `/new` and `/[id]`, filterable by department where relevant (`?department=door-hardware`)
- `/admin/inquiries` — "Enquire"/quote-basket submissions, status New/Contacted/Closed
- `/admin/reviews`, `/admin/photos` — moderation queues (Pending/Approved/Rejected) for
  customer-submitted reviews and project photos
- `/admin/activity` — recent create/update/delete audit trail (see `0008_activity_log.sql`)

## Caching

Public catalog reads (`src/lib/data/catalog.ts`) are wrapped in `unstable_cache` with a
one-hour revalidation and a single `catalog` tag, using a cookie-free anon Supabase client
so they're eligible for caching at all. Every admin write calls `updateTag("catalog")`
afterwards, which expires the cache immediately (read-your-own-writes) rather than serving
stale content — so published changes are visible on the live site right away, not after an
hour. `searchProducts` is intentionally left uncached (search terms are unbounded).

## Deploying

Push to GitHub, import the repo in Vercel, and add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `NEXT_PUBLIC_ENQUIRY_EMAIL`) as
environment variables. Every catalog update after that happens through `/admin` —
no redeploy needed, thanks to `revalidatePath` on every write.
