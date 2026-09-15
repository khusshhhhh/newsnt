"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

function fail(message: string): { error: string } {
  return { error: message };
}

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return fail(error.message);
  redirect(redirectTo || "/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const seriesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  design_story: z.string().optional(),
  hero_image_url: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  display_order: z.coerce.number().int().default(0),
  is_published: z.coerce.boolean().default(false),
});

export async function upsertSeries(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rawSlug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");

  const parsed = seriesSchema.safeParse({
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    design_story: formData.get("design_story") ?? undefined,
    hero_image_url: formData.get("hero_image_url") ?? undefined,
    display_order: formData.get("display_order") ?? 0,
    is_published: formData.get("is_published") === "on",
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("series").update(parsed.data).eq("id", id)
    : await supabase.from("series").insert(parsed.data);

  if (error) return fail(error.message);

  revalidatePath("/admin/series");
  revalidatePath("/series");
  redirect("/admin/series");
}

export async function deleteSeries(id: string) {
  const supabase = await createClient();
  await supabase.from("series").delete().eq("id", id);
  revalidatePath("/admin/series");
  revalidatePath("/series");
}

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  display_order: z.coerce.number().int().default(0),
});

export async function upsertCategory(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rawSlug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");

  const parsed = categorySchema.safeParse({
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    display_order: formData.get("display_order") ?? 0,
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(parsed.data).eq("id", id)
    : await supabase.from("categories").insert(parsed.data);

  if (error) return fail(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/admin/categories");
}

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  category_id: z.string().uuid("Category is required"),
  series_id: z.string().uuid().nullable(),
  price: z.coerce.number().nonnegative().nullable(),
  currency: z.string().min(1).default("INR"),
  description: z.string().optional(),
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

  const parsed = productSchema.safeParse({
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    category_id: formData.get("category_id"),
    series_id: seriesId && seriesId !== "none" ? seriesId : null,
    price: priceRaw ? Number(priceRaw) : null,
    currency: formData.get("currency") || "INR",
    description: formData.get("description") ?? undefined,
    specs: parseSpecs(formData),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
    display_order: formData.get("display_order") ?? 0,
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("products").update(parsed.data).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    redirect(`/admin/products/${id}`);
  }

  const { data, error } = await supabase
    .from("products")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return fail(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect(`/admin/products/${data.id}`);
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

export async function addProductImage(
  productId: string,
  storagePath: string,
  displayOrder: number
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      storage_path: storagePath,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function deleteProductImage(imageId: string, productId: string) {
  const supabase = await createClient();
  const { data: image } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  await supabase.from("product_images").delete().eq("id", imageId);
  if (image?.storage_path) {
    await supabase.storage.from("media").remove([image.storage_path]);
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}
