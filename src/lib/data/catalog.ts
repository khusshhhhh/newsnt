import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Department } from "@/lib/department";
import type { ProductImage, ProductVariantWithImages, ProductWithRelations } from "@/lib/supabase/types";

const PRODUCT_SELECT =
  "*, series(*), category:categories(*), product_images(*), variants:product_variants(*, product_images(*))";

export const PAGE_SIZE = 24;

/**
 * Every public catalog read shares this one tag. Admin writes revalidate it
 * unconditionally on any change (see `revalidateCatalog` in actions.ts) —
 * the catalog is small enough that a blanket invalidation is simpler and
 * safer than tracking which exact query a write could affect, and the
 * `revalidate` below is a time-based safety net regardless.
 */
export const CATALOG_TAG = "catalog";
const CATALOG_REVALIDATE_SECONDS = 3600;

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
};

function emptyPage<T>(page: number): PagedResult<T> {
  return { items: [], total: 0, page, pageCount: 1 };
}

function byDisplayOrder<T extends { display_order: number }>(a: T, b: T) {
  return a.display_order - b.display_order;
}

/**
 * Normalizes a raw embedded product row: `product_images` at the top level
 * covers every photo for the product (default shots and variant-specific
 * ones alike, since they all share `product_id`), so it's narrowed here to
 * just the default/general gallery (`variant_id IS NULL`) and everything is
 * sorted client-side rather than trusting nested embed ordering.
 */
function shapeProduct(raw: unknown): ProductWithRelations {
  const row = raw as ProductWithRelations & { product_images: ProductImage[] };
  const generalImages = (row.product_images ?? [])
    .filter((img) => !img.variant_id)
    .sort(byDisplayOrder);
  const variants: ProductVariantWithImages[] = (row.variants ?? [])
    .map((v) => ({ ...v, product_images: [...(v.product_images ?? [])].sort(byDisplayOrder) }))
    .sort(byDisplayOrder);

  return { ...row, product_images: generalImages, variants };
}

export const getPublishedSeries = unstable_cache(
  async (department: Department) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("series")
      .select("*")
      .eq("department", department)
      .eq("is_published", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data;
  },
  ["published-series"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getSeriesBySlug = unstable_cache(
  async (department: Department, slug: string) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("series")
      .select("*")
      .eq("department", department)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  ["series-by-slug"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getCategories = unstable_cache(
  async (department: Department) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("department", department)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data;
  },
  ["categories"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getCategoryBySlug = unstable_cache(
  async (department: Department, slug: string) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("department", department)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  ["category-by-slug"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getFeaturedProducts = unstable_cache(
  async (department: Department, limit = 8): Promise<ProductWithRelations[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("department", department)
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("display_order", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(shapeProduct);
  },
  ["featured-products"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getProducts = unstable_cache(
  async (
    department: Department,
    filter: { seriesSlug?: string; categorySlug?: string },
    page = 1
  ): Promise<PagedResult<ProductWithRelations>> => {
    const supabase = createPublicClient();
    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("department", department)
      .eq("is_published", true);

    if (filter.seriesSlug) {
      const series = await getSeriesBySlug(department, filter.seriesSlug);
      if (!series) return emptyPage(page);
      query = query.eq("series_id", series.id);
    }

    if (filter.categorySlug) {
      const category = await getCategoryBySlug(department, filter.categorySlug);
      if (!category) return emptyPage(page);
      query = query.eq("category_id", category.id);
    }

    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query
      .order("display_order", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const total = count ?? 0;
    return {
      items: (data ?? []).map(shapeProduct),
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  },
  ["products"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

/**
 * Lightweight, unpaginated lookup of which categories have at least one
 * product in a series — used to decide which category-filter pills to show,
 * independent of `getProducts`' pagination window.
 */
export const getProductCategoryIds = unstable_cache(
  async (department: Department, filter: { seriesSlug?: string }): Promise<Set<string>> => {
    const supabase = createPublicClient();
    let query = supabase
      .from("products")
      .select("category_id")
      .eq("department", department)
      .eq("is_published", true);

    if (filter.seriesSlug) {
      const series = await getSeriesBySlug(department, filter.seriesSlug);
      if (!series) return new Set();
      query = query.eq("series_id", series.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.category_id));
  },
  ["product-category-ids"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

/** Strip characters that would break PostgREST's `.or()` mini-syntax. */
function sanitizeSearchTerm(query: string) {
  return query.replace(/[,()]/g, " ").trim();
}

/** Escape ILIKE metacharacters so a literal "%" or "_" in a search doesn't act as a wildcard. */
function escapeLikePattern(term: string) {
  return term.replace(/[\\%_]/g, (m) => `\\${m}`);
}

// Not cached: search terms are effectively unbounded, so caching them would
// mostly just fill the cache with one-off entries. Still uses the fast
// cookie-free public client since it doesn't need a session either.
export async function searchProducts(
  department: Department,
  query: string,
  page = 1
): Promise<PagedResult<ProductWithRelations>> {
  const term = sanitizeSearchTerm(query);
  if (!term) return emptyPage(page);

  const pattern = `%${escapeLikePattern(term)}%`;
  const supabase = createPublicClient();
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("department", department)
    .eq("is_published", true)
    .or(`name.ilike.${pattern},sku.ilike.${pattern},description.ilike.${pattern}`)
    .order("display_order", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw error;
  const total = count ?? 0;
  return {
    items: (data ?? []).map(shapeProduct),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Minimal, unpaginated product slug list — used for sitemap generation, not display. */
export const getPublishedProductSlugs = unstable_cache(
  async (department: Department): Promise<string[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug")
      .eq("department", department)
      .eq("is_published", true);

    if (error) throw error;
    return (data ?? []).map((p) => p.slug);
  },
  ["published-product-slugs"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getDepartmentHeroImage = unstable_cache(
  async (department: Department): Promise<string | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("series")
      .select("hero_image_url")
      .eq("department", department)
      .eq("is_published", true)
      .not("hero_image_url", "is", null)
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.hero_image_url ?? null;
  },
  ["department-hero-image"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getProductBySlug = unstable_cache(
  async (department: Department, slug: string): Promise<ProductWithRelations | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("department", department)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    return data ? shapeProduct(data) : null;
  },
  ["product-by-slug"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
