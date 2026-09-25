# Flow catalog

Next.js (App Router) storefront + admin panel for Flow's two product lines —
tapware/sanitaryware and door hardware — backed by Supabase (Postgres, Storage, Auth).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + TypeScript + Tailwind v4
- **Supabase**: Postgres for `series` / `categories` / `products` / `product_images` /
  `product_variants`, Storage for photography, Auth for the admin panel
- **shadcn/ui** (Base UI primitives) + `motion` for the admin forms and scroll animation
- Typography: Satoshi (local WOFF2) for headings, Inter for body/UI text; the logo wordmark is
  Ofelia Display converted to SVG outlines
- **Vitest** unit tests (`npm test`) and a GitHub Actions workflow running lint, typecheck,
  tests and build on every push/PR

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
   - [`0008_activity_log.sql`](supabase/migrations/0008_activity_log.sql) — audit trail for admin writes
     (retired and dropped by 0033/0034)
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
   - `0024`–`0027` — inquiry rate limiting, itemized inquiries, the customers/quotes/orders CRM
     (`/admin/customers`, `/admin/orders`), and soft-deleted inquiries (see each file's header comment)
   - [`0028_admin_otp.sql`](supabase/migrations/0028_admin_otp.sql) — adds the emailed-code columns
     `/admin/login` needs for its second sign-in factor (see step 4 below)
   - [`0029_quotes_lifecycle.sql`](supabase/migrations/0029_quotes_lifecycle.sql) — quote status
     (sent/accepted/declined), a per-quote accept/decline token for the customer-facing `/quote/[token]`
     page, and the `department` a quote needs to become an order without going through an inquiry first
   - [`0030_admin_mfa_enforcement.sql`](supabase/migrations/0030_admin_mfa_enforcement.sql) — makes the
     database itself require the emailed sign-in code: every admin read/write now needs an
     MFA-verified session (`is_mfa_admin()`), not just a password. **After running it, every admin must
     sign out and back in once** — existing sessions were never recorded as verified, so they'll see
     empty admin pages until they do.
   - [`0031_admin_roles_ops_and_search.sql`](supabase/migrations/0031_admin_roles_ops_and_search.sql) —
     admin roles (owner/editor/sales, enforced in the database), list indexes, one-call dashboard stats,
     quote expiry/reminders/versions, order payment fields, trash for products/series/customers,
     inquiry email tracking, a richer activity log, the `error_events` table, and typo-tolerant search.
     Existing admins all become **owners**.
   - [`0032_quote_order_discounts.sql`](supabase/migrations/0032_quote_order_discounts.sql) — a
     discount on quotes and orders (`discount_type` percent/amount + `discount_value`; `total` stays
     the post-discount figure), and `get_quote_by_token` returns it so the customer's quote page
     shows subtotal, discount and total.
   - [`0033_stop_activity_logging.sql`](supabase/migrations/0033_stop_activity_logging.sql) and
     [`0034_drop_activity_log.sql`](supabase/migrations/0034_drop_activity_log.sql) — retire the admin
     activity log: `respond_to_quote` stops writing to it, then the `activity_log` table is dropped.
   - [`0035_image_blur_placeholders.sql`](supabase/migrations/0035_image_blur_placeholders.sql) and
     [`0036_drop_image_blur_placeholders.sql`](supabase/migrations/0036_drop_image_blur_placeholders.sql)
     — blurred loading previews per photo, since retired: 0036 drops the `blur_data_url` /
     `series.hero_blur_data_url` columns 0035 added. Safe on either side of a deploy.

   **Run 0030, 0031 and 0032 before deploying the matching code** — the admin panel reads their new
   columns. (The public inquiry form falls back safely if 0031 is missing, so no leads are lost.)
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
     never `NEXT_PUBLIC_`) — **required for admin sign-in**: the emailed-code bookkeeping, recording
     verified sessions, the Team page (inviting/removing admins), error logging and the daily job all
     use it.
   - `RESEND_API_KEY` + `EMAIL_FROM` + `INQUIRY_NOTIFICATION_EMAIL` (resend.com) — emails the team
     when a new inquiry comes in, and is what sends admin sign-in codes and customer quote emails.
     Leave blank in development and those emails are skipped with a console warning rather than
     failing — except admin sign-in, which refuses to start without it (see next point).
   - `ADMIN_MFA_SECRET` (any long random string, e.g. `openssl rand -hex 32`) — signs the session
     cookie issued after an admin enters their emailed sign-in code. Falls back to
     `SUPABASE_SERVICE_ROLE_KEY` if unset, but set both: without email configured too, nobody can
     sign in to `/admin` at all (see "Admin sign-in" below).
   - `CRON_SECRET` (any long random string) — protects `/api/cron/daily`, which Vercel Cron calls
     once a day (see `vercel.json`) to retry failed inquiry emails, send the daily summary and prune
     old rows. Vercel sends it automatically once the variable is set in the project.
   - `ADMIN_DIGEST_EMAIL` (optional) — where the daily summary goes; defaults to
     `INQUIRY_NOTIFICATION_EMAIL`.
   - `ERROR_WEBHOOK_URL` (optional) — server errors are always recorded in `error_events` and shown
     under System health on the admin dashboard; set this to also POST each one to Slack/Discord/etc.
5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

6. Sign in at [`/admin/login`](http://localhost:3000/admin/login) and start adding
   series, categories, and products.

### Admin sign-in

`/admin/login` is password + emailed one-time code: after a correct password, a 6-digit code is
sent to that admin's own email (via `RESEND_API_KEY`) and must be entered at
`/admin/login/verify` before the session counts as fully authenticated. That's enforced three
times over: the middleware (`src/lib/supabase/middleware.ts`) for page routing, `requireAdmin()`
(`src/lib/admin-guard.ts`) at the top of every admin server action, and — the one that matters —
the database, whose RLS policies only let an MFA-verified Supabase session read or write admin
data (`0030`). Codes expire after 10 minutes and lock out after 5 wrong guesses; "Resend code" has
a 60-second cooldown, and sign-in attempts are rate limited per IP. Email must be configured
(`RESEND_API_KEY` + `EMAIL_FROM`) and `SUPABASE_SERVICE_ROLE_KEY` set before *any* admin can sign
in, including the first one. "Forgot your password?" on the login page emails a reset link.

### Roles

Every admin has a role, changed on `/admin/team` (owners only):

| Role | Can use |
|---|---|
| Owner | Everything, including the Team page |
| Editor | Catalog (products, series, categories, finishes) and review/photo moderation |
| Sales | Inquiries, customers, quotes, orders and reports; can view the catalog |

The role is checked in `requireAdmin(scope)` and again in the database (`admin_has_scope()` in
`0031`), so hiding a button is never the only protection.

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
- `/admin/inquiries` — "Enquire"/quote-basket submissions as a list, pipeline board or trash
- `/admin/quotes`, `/admin/orders`, `/admin/customers` — the sales pipeline: quotes (with
  reminders, revisions and 30-day expiry), orders (payment status, invoices, packing slips) and the
  customer CRM
- `/admin/reports` — inquiries per week, quote conversion, most-requested products, order value
- `/admin/reviews`, `/admin/photos` — moderation queues (Pending/Approved/Rejected) for
  customer-submitted reviews and project photos, with approve/reject-all
- `/admin` dashboard — also shows System health (failed inquiry emails with a Retry button, recent
  server errors) whenever there's something to act on
- `/admin/trash` — deleted products, series and customers; restore or delete forever
- `/admin/team` — owners manage who can sign in and their role
- `/quote/[token]` — the customer-facing accept/decline page linked from quote emails
- `/api/cron/daily` — daily housekeeping, called by Vercel Cron

Press **Ctrl/⌘ + K** anywhere in the admin to search everything, and **?** for keyboard shortcuts.

## Caching

Public catalog reads (`src/lib/data/catalog.ts`) are wrapped in `unstable_cache` with a
one-hour revalidation and a single `catalog` tag, using a cookie-free anon Supabase client
so they're eligible for caching at all. Every admin write calls `updateTag("catalog")`
afterwards, which expires the cache immediately (read-your-own-writes) rather than serving
stale content — so published changes are visible on the live site right away, not after an
hour. `searchProducts` is intentionally left uncached (search terms are unbounded).

## Media

- **Uploads** go straight from the browser to Supabase Storage with a live progress ring
  (`src/lib/upload.ts`). Photos are downscaled to at most 2560px and re-encoded to WebP first
  (`src/lib/compress-image.ts` — GIF/AVIF and already-small files are left alone). Every object
  path is unique, so files are stored with a one-year `Cache-Control` and `next.config.ts` keeps
  optimized copies for 31 days.
- **Existing photos** from before that: `node scripts/optimize-media.mjs` does a read-only dry run
  of re-encoding oversized originals; `--apply` writes it (new files +
  updated rows, originals kept and listed in `scripts/.optimize-media-replaced.json`); once the
  catalog has refreshed, `--apply --delete-old` removes the replaced originals.
- **Site assets** (hero stills, team photos, the concept-film poster) live in `src/assets/images`
  as WebP and are imported statically — hashed, immutable URLs. To
  replace one, swap the file; don't reference it by a `/public` URL.
- **The concept film** ships as AV1 and H.264, each in a desktop and a 640px phone cut
  (`public/videos`, sources in the department page's `HERO_MEDIA`); browsers take the first they
  can play. Re-encode a new film the same way, e.g.
  `ffmpeg -i film.mp4 -an -c:v libaom-av1 -crf 36 -b:v 0 -cpu-used 4 -row-mt 1 -movflags +faststart film-av1.mp4`
  (add `-vf scale=640:-2` for the phone cut).
- **The logo** is the "FLOW" wordmark as inline SVG outlines (`src/components/logo.tsx`), so no
  web font or Adobe Fonts kit loads for it.

## Deploying

Push to GitHub, import the repo in Vercel, and add the environment variables from step 4 above
(at minimum the Supabase URL/keys, `SUPABASE_SERVICE_ROLE_KEY`, the Resend settings,
`NEXT_PUBLIC_SITE_URL` and `CRON_SECRET`). Every catalog update after that happens through
`/admin` — no redeploy needed, thanks to cache revalidation on every write.

The app sends a Content-Security-Policy and other security headers (`next.config.ts`). If you
add a third-party script, image host or font service, add its origin there too.

## Backups

The database holds leads, quotes and orders that exist nowhere else, so check this before relying
on it:

- **Supabase Pro and above** take daily backups automatically (Dashboard → Database → Backups);
  turn on **Point-in-Time Recovery** there if losing up to a day of orders would hurt.
- **On the free plan there are no automatic backups.** Take your own, e.g. weekly:
  `supabase db dump --linked -f backup-$(date +%F).sql` (schema + data) plus
  `supabase db dump --linked --data-only -f data-$(date +%F).sql`, and keep them off-site.
- Storage (product photos, spec sheets) is **not** included in database backups; copy the `media`
  and `documents` buckets separately if you need them.
- Test a restore into a scratch project once, so you know it works before you need it.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run typecheck # TypeScript
npm run lint
```
