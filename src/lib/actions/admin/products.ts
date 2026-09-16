"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { logActivity } from "@/lib/data/activity";
import { departmentSchema, fail, ok, revalidateCatalog } from "./_shared";

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

  const supabase = await createClient();

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
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // Currency is locked to AUD everywhere — never taken from the form, so no
  // client can override it regardless of what's submitted.
  const payload = { ...parsed.data, currency: "AUD" };

  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return fail(error.message);

    await logActivity({ action: "update", entity_type: "product", entity_id: id, entity_name: payload.name });
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

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("name").eq("id", id).maybeSingle();
  await supabase.from("products").delete().eq("id", id);

  await logActivity({
    action: "delete",
    entity_type: "product",
    entity_id: id,
    entity_name: product?.name,
  });
  revalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}
