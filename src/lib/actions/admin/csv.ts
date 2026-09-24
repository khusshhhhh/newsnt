"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { parseCsv } from "@/lib/csv";
import { slugify } from "@/lib/slugify";
import { isDepartment } from "@/lib/department";
import { revalidateCatalog } from "./_shared";

export type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

const TRUE_PATTERN = /^(true|1|yes)$/i;

/**
 * Bulk-creates or updates products from an admin-uploaded CSV (see the
 * export route for the matching column layout). Matches an existing product
 * by slug first, then SKU; anything else becomes a new product. Category and
 * series are resolved by name within the row's department — a row whose
 * category/series/department/price can't be resolved is skipped with a
 * reason rather than aborting the rest of the file.
 */
export async function importProductsCsv(
  _prevState: unknown,
  formData: FormData
): Promise<ImportSummary> {
  const file = formData.get("file");
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  if (!(file instanceof File) || file.size === 0) {
    summary.errors.push("No file selected");
    return summary;
  }

  const rows = parseCsv(await file.text());
  const { supabase } = await requireAdmin("catalog");

  for (const [index, row] of rows.entries()) {
    const line = index + 2; // header is line 1
    const name = row.name?.trim();
    const department = row.department?.trim();
    const categoryName = row.category?.trim();

    if (!name) {
      summary.skipped += 1;
      summary.errors.push(`Row ${line}: missing name`);
      continue;
    }
    if (!department || !isDepartment(department)) {
      summary.skipped += 1;
      summary.errors.push(`Row ${line}: unknown department "${department ?? ""}"`);
      continue;
    }
    if (!categoryName) {
      summary.skipped += 1;
      summary.errors.push(`Row ${line}: missing category`);
      continue;
    }

    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("department", department)
      .ilike("name", categoryName)
      .maybeSingle();
    if (!category) {
      summary.skipped += 1;
      summary.errors.push(`Row ${line}: category "${categoryName}" not found in ${department}`);
      continue;
    }

    let seriesId: string | null = null;
    const seriesName = row.series?.trim();
    if (seriesName) {
      const { data: series } = await supabase
        .from("series")
        .select("id")
        .eq("department", department)
        .ilike("name", seriesName)
        .maybeSingle();
      if (!series) {
        summary.skipped += 1;
        summary.errors.push(`Row ${line}: series "${seriesName}" not found in ${department}`);
        continue;
      }
      seriesId = series.id;
    }

    const priceRaw = row.price?.trim();
    const price = priceRaw ? Number(priceRaw) : null;
    if (priceRaw && Number.isNaN(price)) {
      summary.skipped += 1;
      summary.errors.push(`Row ${line}: invalid price "${priceRaw}"`);
      continue;
    }

    const slug = row.slug?.trim() ? slugify(row.slug.trim()) : slugify(name);
    const sku = row.sku?.trim() || null;
    const displayOrderRaw = row.display_order?.trim();
    const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

    const payload = {
      department,
      name,
      slug,
      sku,
      category_id: category.id,
      series_id: seriesId,
      price,
      currency: "AUD",
      is_featured: TRUE_PATTERN.test(row.is_featured?.trim() ?? ""),
      is_published: row.is_published?.trim() ? TRUE_PATTERN.test(row.is_published.trim()) : true,
      display_order: Number.isNaN(displayOrder) ? 0 : displayOrder,
    };

    let existingId: string | null = null;
    const { data: bySlug } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (bySlug) {
      existingId = bySlug.id;
    } else if (sku) {
      const { data: bySku } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
      if (bySku) existingId = bySku.id;
    }

    if (existingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", existingId);
      if (error) {
        summary.skipped += 1;
        summary.errors.push(`Row ${line}: ${error.message}`);
        continue;
      }
      summary.updated += 1;
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) {
        summary.skipped += 1;
        summary.errors.push(`Row ${line}: ${error.message}`);
        continue;
      }
      summary.created += 1;
    }
  }

  if (summary.created > 0 || summary.updated > 0) {
    revalidateCatalog();
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
  }

  return summary;
}
