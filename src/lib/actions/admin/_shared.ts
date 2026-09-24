import { updateTag } from "next/cache";
import { z } from "zod";
import { DEPARTMENTS } from "@/lib/department";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { normalizeDiscount } from "@/lib/discount";
import { sanitizeBlurDataUrl } from "@/lib/blur-placeholder";

export const departmentSchema = z.enum(DEPARTMENTS);

/** A whole-document discount on a quote or order — a percentage (0–100) or a dollar amount. Null/absent = none. */
export const discountSchema = z
  .object({
    type: z.enum(["percent", "amount"]),
    value: z.coerce.number().positive("Discount must be more than zero"),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, "A percentage discount can't be more than 100%")
  .nullable()
  .optional();

/** The discount columns for an insert/update — both null when there's no discount. */
export function discountColumns(discount: { type: "percent" | "amount"; value: number } | null | undefined) {
  const d = normalizeDiscount(discount);
  return { discount_type: d?.type ?? null, discount_value: d?.value ?? null };
}

/**
 * The gallery an ImageUploader submitted: its paths in order, each paired
 * with the blurred preview from the parallel `${field}_blur` inputs. Images
 * that were already saved come through with no preview ("") and keep the
 * one they have in `existing`.
 */
export function galleryFromForm(
  formData: FormData,
  field: string,
  max: number,
  existing: { storage_path: string; blur_data_url: string | null }[] = []
) {
  const blurs = formData.getAll(`${field}_blur`);
  const existingBlur = new Map(existing.map((img) => [img.storage_path, img.blur_data_url]));
  return formData
    .getAll(field)
    .map((value, index) => ({ path: String(value), blur: sanitizeBlurDataUrl(blurs[index]) }))
    .filter((img) => img.path)
    .slice(0, max)
    .map((img) => ({ path: img.path, blur: img.blur ?? existingBlur.get(img.path) ?? null }));
}

export function fail(message: string): { error: string } {
  return { error: message };
}

export function ok(id: string): { success: true; id: string } {
  return { success: true, id };
}

/**
 * Invalidates every cached public catalog read (see catalog.ts) after any
 * admin write. `updateTag` (rather than `revalidateTag`) expires it
 * immediately so the admin sees their own change on the next page, instead
 * of stale-while-revalidate serving the old value for a while.
 */
export function revalidateCatalog() {
  updateTag(CATALOG_TAG);
}
