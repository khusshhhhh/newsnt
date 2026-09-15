# Aakar catalog

Next.js (App Router) storefront + admin panel for the Aakar tapware/sanitaryware
catalog, backed by Supabase (Postgres, Storage, Auth).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + TypeScript + Tailwind v4
- **Supabase**: Postgres for `series` / `categories` / `products` / `product_images`,
  Storage for photography, Auth for the admin panel
- **shadcn/ui** (Base UI primitives) for the admin forms

## Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run the migrations in order:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — schema, RLS policies, `media` storage bucket
   - [`supabase/migrations/0002_seed.sql`](supabase/migrations/0002_seed.sql) — optional sample categories/series
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

`series` and `categories` are independent dimensions — a product belongs to exactly one
category and *optionally* one series (`series_id` is nullable, so door handles and other
non-series items work fine). This lets the storefront browse "everything in Series 3",
"every basin mixer across all series" (`/category/[slug]`), or both together
(`/series/[slug]/[categorySlug]`).

Product `specs` (finish, material, dimensions, ...) are a free-form JSON key/value map,
edited as repeatable rows in the admin product form.

## Routes

- `/`, `/series`, `/series/[seriesSlug]`, `/series/[seriesSlug]/[categorySlug]`,
  `/category/[categorySlug]`, `/product/[productSlug]` — public catalog
- `/admin` — dashboard (protected; redirects to `/admin/login` if signed out)
- `/admin/series`, `/admin/categories`, `/admin/products` — CRUD, each with `/new` and `/[id]`

## Deploying

Push to GitHub, import the repo in Vercel, and add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `NEXT_PUBLIC_ENQUIRY_EMAIL`) as
environment variables. Every catalog update after that happens through `/admin` —
no redeploy needed, thanks to `revalidatePath` on every write.
