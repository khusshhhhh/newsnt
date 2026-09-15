import { createClient } from "@/lib/supabase/server";
import type { ProductWithRelations } from "@/lib/supabase/types";

export async function getPublishedSeries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getSeriesBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, series(*), category:categories(*), product_images(*)")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("display_order", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function getProducts(filter: {
  seriesSlug?: string;
  categorySlug?: string;
}): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, series(*), category:categories(*), product_images(*)")
    .eq("is_published", true);

  if (filter.seriesSlug) {
    const series = await getSeriesBySlug(filter.seriesSlug);
    if (!series) return [];
    query = query.eq("series_id", series.id);
  }

  if (filter.categorySlug) {
    const category = await getCategoryBySlug(filter.categorySlug);
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }

  const { data, error } = await query.order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, series(*), category:categories(*), product_images(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ProductWithRelations | null;
}
