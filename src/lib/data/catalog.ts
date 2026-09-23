import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { escapeLikePattern, sanitizeSearchTerm } from "@/lib/search";
import type { Department } from "@/lib/department";
import type {
  Category,
  CategoryImage,
  CategoryWithImages,
  Finish,
  ProductImage,
  ProductResource,
  ProductVariantWithImages,
  ProductWithRelations,
  ProjectPhoto,
  Review,
  Series,
  SeriesImage,
  SeriesWithImages,
} from "@/lib/supabase/types";

/** Matches the admin uploader's cap for both category and series galleries. */
const MAX_GALLERY_IMAGES = 6;

export const PRODUCT_SELECT =
  "*, series(*), category:categories(*), product_images(*), variants:product_variants(*, product_images(*)), resources:product_resources(*)";

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
export function shapeProduct(raw: unknown): ProductWithRelations {
  const row = raw as ProductWithRelations & { product_images: ProductImage[] };
  const generalImages = (row.product_images ?? [])
    .filter((img) => !img.variant_id)
    .sort(byDisplayOrder);
  const variants: ProductVariantWithImages[] = (row.variants ?? [])
    .map((v) => ({ ...v, product_images: [...(v.product_images ?? [])].sort(byDisplayOrder) }))
    .sort(byDisplayOrder);
  const resources: ProductResource[] = [...(row.resources ?? [])].sort(byDisplayOrder);

  return { ...row, product_images: generalImages, variants, resources };
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

/**
 * Narrows a raw embedded series row's `series_images` into a sorted, capped
 * `images` array — the cap mirrors the admin form's 6-image limit as a
 * defense in depth in case older rows ever exceed it.
 */
function shapeSeries(raw: unknown): SeriesWithImages {
  const { series_images, ...series } = raw as Series & { series_images: SeriesImage[] };
  return {
    ...series,
    images: [...(series_images ?? [])].sort(byDisplayOrder).slice(0, MAX_GALLERY_IMAGES),
  };
}

export const getSeriesBySlug = unstable_cache(
  async (department: Department, slug: string): Promise<SeriesWithImages | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("series")
      .select("*, series_images(*)")
      .eq("department", department)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    return data ? shapeSeries(data) : null;
  },
  ["series-by-slug"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

/**
 * Narrows a raw embedded category row's `category_images` into a sorted,
 * capped `images` array — the cap mirrors the admin form's 6-image limit as a
 * defense in depth in case older rows ever exceed it.
 */
function shapeCategory(raw: unknown): CategoryWithImages {
  const { category_images, ...category } = raw as Category & { category_images: CategoryImage[] };
  return {
    ...category,
    images: [...(category_images ?? [])].sort(byDisplayOrder).slice(0, MAX_GALLERY_IMAGES),
  };
}

export const getCategories = unstable_cache(
  async (department: Department): Promise<CategoryWithImages[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*, category_images(*)")
      .eq("department", department)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(shapeCategory);
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
    filter: { seriesSlug?: string; categorySlug?: string; finishCode?: string },
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

    if (filter.finishCode) {
      const finish = await getFinishByCode(filter.finishCode);
      if (!finish) return emptyPage(page);
      const { data: variantRows, error: variantError } = await supabase
        .from("product_variants")
        .select("product_id")
        .ilike("color_name", finish.name);
      if (variantError) throw variantError;
      const productIds = [...new Set((variantRows ?? []).map((r) => r.product_id))];
      if (productIds.length === 0) return emptyPage(page);
      query = query.in("id", productIds);
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
    .or(`name.ilike.${pattern},sku.ilike.${pattern}`)
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

/**
 * PGRST205 = PostgREST can't find the table — i.e. the migration that
 * creates it (0018/0020/0021) hasn't been run yet. These three reads back
 * new, purely additive product-page content (finishes, reviews, project
 * photos), so degrading to "none yet" rather than throwing keeps the rest of
 * an otherwise-working product page rendering during the window between
 * deploying this code and running its migrations.
 */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205";
}

export const getActiveFinishes = unstable_cache(
  async (): Promise<Finish[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("finishes")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return data ?? [];
  },
  ["active-finishes"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getFinishByCode = unstable_cache(
  async (code: string): Promise<Finish | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("finishes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return null;
      throw error;
    }
    return data;
  },
  ["finish-by-code"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getApprovedReviews = unstable_cache(
  async (productId: string): Promise<Review[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return data ?? [];
  },
  ["approved-reviews"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);

export const getApprovedProjectPhotos = unstable_cache(
  async (department: Department): Promise<(ProjectPhoto & { series: Series | null })[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("project_photos")
      .select("*, series(*)")
      .eq("department", department)
      .eq("status", "approved")
      .order("display_order", { ascending: true });

    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return data ?? [];
  },
  ["approved-project-photos"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] }
);
