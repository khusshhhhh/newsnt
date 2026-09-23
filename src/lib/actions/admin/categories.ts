"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { slugify } from "@/lib/slugify";
import { logActivity } from "@/lib/data/activity";
import { departmentSchema, fail, ok, revalidateCatalog } from "./_shared";

const categorySchema = z.object({
  department: departmentSchema,
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  display_order: z.coerce.number().int().default(0),
});

const MAX_CATEGORY_IMAGES = 6;

export async function upsertCategory(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rawSlug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");
  const images = formData
    .getAll("images")
    .map(String)
    .filter(Boolean)
    .slice(0, MAX_CATEGORY_IMAGES);

  const parsed = categorySchema.safeParse({
    department: formData.get("department"),
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    display_order: formData.get("display_order") ?? 0,
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const { supabase } = await requireAdmin("catalog");
  const { data: category, error } = id
    ? await supabase.from("categories").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("categories").insert(parsed.data).select("id").single();

  if (error) return fail(error.message);
  const categoryId = category.id;

  // Reconcile the gallery: drop storage objects for images the admin
  // removed, then replace the row set with the submitted order so
  // `display_order` always matches the order shown in the uploader.
  const { data: existingImages } = await supabase
    .from("category_images")
    .select("storage_path")
    .eq("category_id", categoryId);
  const removedPaths = (existingImages ?? [])
    .map((img) => img.storage_path)
    .filter((path) => !images.includes(path));

  if (removedPaths.length > 0) {
    await supabase.storage.from("media").remove(removedPaths);
  }
  await supabase.from("category_images").delete().eq("category_id", categoryId);
  if (images.length > 0) {
    await supabase
      .from("category_images")
      .insert(images.map((storage_path, index) => ({ category_id: categoryId, storage_path, display_order: index })));
  }

  await logActivity({
    action: id ? "update" : "create",
    entity_type: "category",
    entity_name: parsed.data.name,
  });
  revalidateCatalog();
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return ok(categoryId);
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireAdmin("catalog");
  const { data: category } = await supabase
    .from("categories")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  const { data: images } = await supabase
    .from("category_images")
    .select("storage_path")
    .eq("category_id", id);

  await supabase.from("categories").delete().eq("id", id);

  const paths = (images ?? []).map((img) => img.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("media").remove(paths);
  }

  await logActivity({
    action: "delete",
    entity_type: "category",
    entity_id: id,
    entity_name: category?.name,
  });
  revalidateCatalog();
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}
