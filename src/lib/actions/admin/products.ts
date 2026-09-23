"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { slugify } from "@/lib/slugify";
import { computeVariantSku } from "@/lib/colors";
import { diffFields, logActivity } from "@/lib/data/activity";
import { departmentSchema, fail, ok, revalidateCatalog } from "./_shared";
import type { StockStatus } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

const STOCK_STATUSES: StockStatus[] = ["in_stock", "made_to_order", "out_of_stock", "discontinued"];

const productSchema = z.object({
  department: departmentSchema,
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  // The SKU prefix every color variant's SKU is built from (see
  // lib/colors.ts's computeVariantSku) — compulsory for every product.
  sku: z.string().trim().min(1, "SKU prefix is required"),
  category_id: z.string().uuid("Category is required"),
  series_id: z.string().uuid().nullable(),
  price: z.coerce.number().nonnegative().nullable(),
  specs: z.record(z.string(), z.string()),
  is_featured: z.coerce.boolean().default(false),
  is_published: z.coerce.boolean().default(false),
  display_order: z.coerce.number().int().default(0),
  meta_title: z.string().trim().max(70).nullable(),
  meta_description: z.string().trim().max(160).nullable(),
  stock_status: z.enum(["in_stock", "made_to_order", "out_of_stock", "discontinued"]).default("in_stock"),
});

function parseSpecs(formData: FormData) {
  const keys = formData.getAll("specs_key").map(String);
  const values = formData.getAll("specs_value").map(String);
  const specs: Record<string, string> = {};
  keys.forEach((key, i) => {
    const trimmedKey = key.trim();
    const value = values[i]?.trim();
    if (trimmedKey && value) specs[trimmedKey] = value;
  });
  return specs;
}

export async function upsertProduct(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rawSlug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");
  const seriesId = String(formData.get("series_id") ?? "");
  const priceRaw = String(formData.get("price") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const metaTitleRaw = String(formData.get("meta_title") ?? "").trim();
  const metaDescriptionRaw = String(formData.get("meta_description") ?? "").trim();

  const { supabase } = await requireAdmin("catalog");

  // A product's department always follows its category, so it's derived
  // here rather than trusted from the form.
  const { data: category } = await supabase
    .from("categories")
    .select("department")
    .eq("id", categoryId)
    .maybeSingle();

  const parsed = productSchema.safeParse({
    department: category?.department,
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    sku: formData.get("sku") ?? "",
    category_id: categoryId,
    series_id: seriesId && seriesId !== "none" ? seriesId : null,
    price: priceRaw ? Number(priceRaw) : null,
    specs: parseSpecs(formData),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
    display_order: formData.get("display_order") ?? 0,
    meta_title: metaTitleRaw || null,
    meta_description: metaDescriptionRaw || null,
    stock_status: formData.get("stock_status") || "in_stock",
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // Currency is locked to AUD everywhere — never taken from the form, so no
  // client can override it regardless of what's submitted.
  const payload = { ...parsed.data, currency: "AUD" };

  if (id) {
    const { data: before } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return fail(error.message);

    await logActivity({
      action: "update",
      entity_type: "product",
      entity_id: id,
      entity_name: payload.name,
      changes: diffFields(before, payload, [
        "name",
        "slug",
        "sku",
        "category_id",
        "series_id",
        "price",
        "is_published",
        "is_featured",
        "stock_status",
        "meta_title",
        "meta_description",
        "specs",
      ]),
    });
    revalidateCatalog();
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return ok(id);
  }

  const { data, error } = await supabase.from("products").insert(payload).select("id").single();

  if (error) return fail(error.message);

  await logActivity({
    action: "create",
    entity_type: "product",
    entity_id: data.id,
    entity_name: payload.name,
  });
  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return ok(data.id);
}

function revalidateProducts() {
  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/admin/trash");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

/**
 * "Delete" moves products to trash (restorable from /admin/trash) and
 * unpublishes them so they drop off the storefront immediately. Permanent
 * deletion is a separate, explicit action in the trash.
 */
export async function trashProducts(ids: string[]) {
  if (ids.length === 0) return;
  const { supabase } = await requireAdmin("catalog");
  const { data: products, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_published: false, is_featured: false })
    .in("id", ids)
    .select("id, name");
  if (error) throw new Error(error.message);

  for (const product of products ?? []) {
    await logActivity({ action: "delete", entity_type: "product", entity_id: product.id, entity_name: product.name });
  }
  revalidateProducts();
}

export async function deleteProduct(id: string) {
  await trashProducts([id]);
}

/** Restores trashed products as drafts — they were unpublished on the way into trash. */
export async function restoreProducts(ids: string[]) {
  if (ids.length === 0) return;
  const { supabase } = await requireAdmin("catalog");
  const { data: products, error } = await supabase
    .from("products")
    .update({ deleted_at: null })
    .in("id", ids)
    .select("id, name");
  if (error) throw new Error(error.message);

  for (const product of products ?? []) {
    await logActivity({ action: "restore", entity_type: "product", entity_id: product.id, entity_name: product.name });
  }
  revalidateProducts();
}

/** Permanently removes a trashed product, its photo files included. Refuses anything not already in trash. */
export async function purgeProduct(id: string) {
  const { supabase } = await requireAdmin("catalog");
  const { data: product } = await supabase
    .from("products")
    .select("name, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!product) throw new Error("Product not found");
  if (!product.deleted_at) throw new Error("Move the product to trash first.");

  const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const paths = (images ?? []).map((img) => img.storage_path);
  if (paths.length > 0) await supabase.storage.from("media").remove(paths);

  await logActivity({ action: "delete", entity_type: "product", entity_id: id, entity_name: `${product.name} (permanently)` });
  revalidateProducts();
}

export async function bulkSetStockStatus(ids: string[], stockStatus: StockStatus) {
  if (ids.length === 0) return;
  if (!STOCK_STATUSES.includes(stockStatus)) throw new Error("Invalid stock status");
  const { supabase } = await requireAdmin("catalog");
  const { error } = await supabase.from("products").update({ stock_status: stockStatus }).in("id", ids);
  if (error) throw new Error(error.message);
  await logActivity({
    action: "update",
    entity_type: "product",
    entity_name: `${ids.length} product(s) set to ${stockStatus.replace(/_/g, " ")}`,
  });
  revalidateProducts();
}

/** Moves products to another category — only within the category's own department. */
export async function bulkSetCategory(ids: string[], categoryId: string) {
  if (ids.length === 0) return;
  const { supabase } = await requireAdmin("catalog");
  const { data: category } = await supabase
    .from("categories")
    .select("name, department")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) throw new Error("Category not found");

  const { error } = await supabase
    .from("products")
    .update({ category_id: categoryId })
    .in("id", ids)
    .eq("department", category.department);
  if (error) throw new Error(error.message);
  await logActivity({
    action: "update",
    entity_type: "product",
    entity_name: `${ids.length} product(s) moved to ${category.name}`,
  });
  revalidateProducts();
}

export async function updateProductPrice(id: string, price: number | null) {
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    throw new Error("Enter a valid price");
  }

  const { supabase } = await requireAdmin("catalog");
  const { data, error } = await supabase
    .from("products")
    .update({ price })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return data;
}

export async function updateProductStockStatus(id: string, stockStatus: StockStatus) {
  if (!STOCK_STATUSES.includes(stockStatus)) {
    throw new Error("Invalid stock status");
  }

  const { supabase } = await requireAdmin("catalog");
  const { data, error } = await supabase
    .from("products")
    .update({ stock_status: stockStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return data;
}

export async function updateProductFeatured(id: string, isFeatured: boolean) {
  const { supabase } = await requireAdmin("catalog");
  const { error } = await supabase.from("products").update({ is_featured: isFeatured }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

export async function bulkSetPublished(ids: string[], isPublished: boolean) {
  if (ids.length === 0) return;
  const { supabase } = await requireAdmin("catalog");
  const { error } = await supabase
    .from("products")
    .update({ is_published: isPublished })
    .in("id", ids)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  await logActivity({
    action: "update",
    entity_type: "product",
    entity_id: ids.length === 1 ? ids[0] : null,
    entity_name: `${ids.length} product(s) ${isPublished ? "published" : "unpublished"}`,
  });

  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

async function uniqueSlug(supabase: SupabaseServerClient, baseSlug: string) {
  let candidate = `${baseSlug}-copy`;
  let n = 2;
  while (true) {
    const { data } = await supabase.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}-copy-${n}`;
    n += 1;
  }
}

async function uniqueSku(supabase: SupabaseServerClient, baseSku: string) {
  let candidate = `${baseSku}-COPY`;
  let n = 2;
  while (true) {
    const { data } = await supabase.from("products").select("id").eq("sku", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSku}-COPY${n}`;
    n += 1;
  }
}

/**
 * Deep-copies a product: the row itself, its colors (with their own SKUs and
 * prices recomputed against the copy's new SKU prefix), and every photo —
 * each image is copied to a new storage object rather than sharing the
 * original's path, since deleting an image row also deletes its file and a
 * shared path would let deleting one product silently break the other's photos.
 */
export async function duplicateProduct(id: string) {
  const { supabase } = await requireAdmin("catalog");

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (productError || !product) throw new Error(productError?.message ?? "Product not found");

  const [{ data: variants }, { data: images }, { data: finishes }] = await Promise.all([
    supabase.from("product_variants").select("*").eq("product_id", id),
    supabase.from("product_images").select("*").eq("product_id", id),
    supabase.from("finishes").select("name, code"),
  ]);
  const finishCodeByName = new Map((finishes ?? []).map((f) => [f.name, f.code]));

  const newSlug = await uniqueSlug(supabase, product.slug);
  const newSku = product.sku ? await uniqueSku(supabase, product.sku) : product.sku;

  const { data: newProduct, error: insertError } = await supabase
    .from("products")
    .insert({
      department: product.department,
      series_id: product.series_id,
      category_id: product.category_id,
      name: `${product.name} (Copy)`,
      slug: newSlug,
      sku: newSku,
      price: product.price,
      currency: "AUD",
      description: product.description,
      specs: product.specs,
      is_featured: false,
      is_published: false,
      display_order: product.display_order,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      stock_status: product.stock_status,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const variantIdMap = new Map<string, string>();
  for (const variant of variants ?? []) {
    const { data: newVariant, error: variantError } = await supabase
      .from("product_variants")
      .insert({
        product_id: newProduct.id,
        color_name: variant.color_name,
        color_hex: variant.color_hex,
        sku:
          newSku && finishCodeByName.has(variant.color_name)
            ? computeVariantSku(newSku, finishCodeByName.get(variant.color_name)!)
            : null,
        price: variant.price,
        stock_status: variant.stock_status,
        display_order: variant.display_order,
      })
      .select("id")
      .single();
    // Best-effort: a color that somehow can't be copied shouldn't abort the whole duplicate.
    if (variantError || !newVariant) continue;
    variantIdMap.set(variant.id, newVariant.id);
  }

  for (const image of images ?? []) {
    const newVariantId = image.variant_id ? (variantIdMap.get(image.variant_id) ?? null) : null;
    if (image.variant_id && !newVariantId) continue;
    const prefix = newVariantId
      ? `products/${newProduct.id}/variants/${newVariantId}`
      : `products/${newProduct.id}`;
    const newPath = `${prefix}/${crypto.randomUUID()}-${image.storage_path.split("/").pop()}`;
    const { error: copyError } = await supabase.storage.from("media").copy(image.storage_path, newPath);
    if (copyError) continue;
    await supabase.from("product_images").insert({
      product_id: newProduct.id,
      variant_id: newVariantId,
      storage_path: newPath,
      alt_text: image.alt_text,
      display_order: image.display_order,
    });
  }

  await logActivity({
    action: "create",
    entity_type: "product",
    entity_id: newProduct.id,
    entity_name: `${product.name} (Copy)`,
  });
  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return newProduct.id;
}
