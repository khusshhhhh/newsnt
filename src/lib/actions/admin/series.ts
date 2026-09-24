"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { slugify } from "@/lib/slugify";
import { isMissingBlurColumn, withoutBlur } from "@/lib/blur-placeholder";
import { departmentSchema, fail, galleryFromForm, ok, revalidateCatalog } from "./_shared";

const seriesSchema = z.object({
  department: departmentSchema,
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

const MAX_SERIES_IMAGES = 6;

export async function upsertSeries(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rawSlug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");
  const { supabase } = await requireAdmin("catalog");
  const { data: existingImages } = id
    ? await supabase.from("series_images").select("*").eq("series_id", id)
    : { data: [] };
  const gallery = galleryFromForm(formData, "hero_images", MAX_SERIES_IMAGES, existingImages ?? []);
  const images = gallery.map((img) => img.path);

  const parsed = seriesSchema.safeParse({
    department: formData.get("department"),
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    design_story: formData.get("design_story") ?? undefined,
    // Derived from the gallery rather than a separate field: the first
    // uploaded image doubles as the homepage carousel/OG cover image.
    hero_image_url: images[0] ?? undefined,
    display_order: formData.get("display_order") ?? 0,
    is_published: formData.get("is_published") === "on",
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const save = (row: typeof parsed.data & { hero_blur_data_url?: string | null }) =>
    id
      ? supabase.from("series").update(row).eq("id", id).select("id").single()
      : supabase.from("series").insert(row).select("id").single();
  let { data: series, error } = await save({ ...parsed.data, hero_blur_data_url: gallery[0]?.blur ?? null });
  if (isMissingBlurColumn(error)) ({ data: series, error } = await save(parsed.data));

  if (error || !series) return fail(error?.message ?? "Failed to save series");
  const seriesId = series.id;

  // Reconcile the gallery: drop storage objects for images the admin
  // removed, then replace the row set with the submitted order so
  // `display_order` always matches the order shown in the uploader.
  const removedPaths = (existingImages ?? [])
    .map((img) => img.storage_path)
    .filter((path) => !images.includes(path));

  if (removedPaths.length > 0) {
    await supabase.storage.from("media").remove(removedPaths);
  }
  await supabase.from("series_images").delete().eq("series_id", seriesId);
  if (images.length > 0) {
    const rows = gallery.map((img, index) => ({
      series_id: seriesId,
      storage_path: img.path,
      blur_data_url: img.blur,
      display_order: index,
    }));
    const { error: imagesError } = await supabase.from("series_images").insert(rows);
    if (isMissingBlurColumn(imagesError)) await supabase.from("series_images").insert(rows.map(withoutBlur));
  }

  revalidateCatalog();
  revalidatePath("/admin/series");
  revalidatePath("/", "layout");
  return ok(seriesId);
}

/** Moves a series to trash (and off the storefront); restorable from /admin/trash. */
export async function deleteSeries(id: string) {
  const { supabase } = await requireAdmin("catalog");
  const { error } = await supabase
    .from("series")
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath("/admin/series");
  revalidatePath("/admin/trash");
  revalidatePath("/", "layout");
}

export async function restoreSeries(id: string) {
  const { supabase } = await requireAdmin("catalog");
  const { error } = await supabase
    .from("series")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath("/admin/series");
  revalidatePath("/admin/trash");
}

/** Permanently removes a trashed series and its photo files. */
export async function purgeSeries(id: string) {
  const { supabase } = await requireAdmin("catalog");
  const { data: series } = await supabase.from("series").select("name, deleted_at").eq("id", id).maybeSingle();
  if (!series) throw new Error("Series not found");
  if (!series.deleted_at) throw new Error("Move the series to trash first.");
  const { data: images } = await supabase
    .from("series_images")
    .select("storage_path")
    .eq("series_id", id);

  const { error: deleteError } = await supabase.from("series").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);

  const paths = (images ?? []).map((img) => img.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("media").remove(paths);
  }

  revalidateCatalog();
  revalidatePath("/admin/series");
  revalidatePath("/admin/trash");
  revalidatePath("/", "layout");
}
