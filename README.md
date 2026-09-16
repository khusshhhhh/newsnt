# Aakar catalog

Next.js (App Router) storefront + admin panel for Aakar's two product lines —
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
3. In Supabase → Authentication, create your own admin user (email + password). Anyone
   who can sign in can manage the catalog — there's no separate roles table.
4. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API).
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
- `/admin` — dashboard (protected; redirects to `/admin/login` if signed out)
- `/admin/series`, `/admin/categories`, `/admin/products` — CRUD, each with `/new` and
  `/[id]`, filterable by department (`?department=door-hardware`)

## Deploying

Push to GitHub, import the repo in Vercel, and add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `NEXT_PUBLIC_ENQUIRY_EMAIL`) as
environment variables. Every catalog update after that happens through `/admin` —
no redeploy needed, thanks to `revalidatePath` on every write.
