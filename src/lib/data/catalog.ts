import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/lib/department";
import type { ProductImage, ProductVariantWithImages, ProductWithRelations } from "@/lib/supabase/types";

const PRODUCT_SELECT =
  "*, series(*), category:categories(*), product_images(*), variants:product_variants(*, product_images(*))";

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

export async function getPublishedSeries(department: Department) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .eq("department", department)
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getSeriesBySlug(department: Department, slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .eq("department", department)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCategories(department: Department) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("department", department)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(department: Department, slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("department", department)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getFeaturedProducts(
  department: Department,
  limit = 8
): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
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
}

export async function getProducts(
  department: Department,
  filter: { seriesSlug?: string; categorySlug?: string }
): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("department", department)
    .eq("is_published", true);

  if (filter.seriesSlug) {
    const series = await getSeriesBySlug(department, filter.seriesSlug);
    if (!series) return [];
    query = query.eq("series_id", series.id);
  }

  if (filter.categorySlug) {
    const category = await getCategoryBySlug(department, filter.categorySlug);
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }

  const { data, error } = await query.order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(shapeProduct);
}

/** Strip characters that would break PostgREST's `.or()` mini-syntax. */
function sanitizeSearchTerm(query: string) {
  return query.replace(/[,()]/g, " ").trim();
}

export async function searchProducts(
  department: Department,
  query: string
): Promise<ProductWithRelations[]> {
  const term = sanitizeSearchTerm(query);
  if (!term) return [];

  const pattern = `%${term}%`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("department", department)
    .eq("is_published", true)
    .or(`name.ilike.${pattern},sku.ilike.${pattern},description.ilike.${pattern}`)
    .order("display_order", { ascending: true })
    .limit(24);

  if (error) throw error;
  return (data ?? []).map(shapeProduct);
}

export async function getProductBySlug(
  department: Department,
  slug: string
): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("department", department)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data ? shapeProduct(data) : null;
}
