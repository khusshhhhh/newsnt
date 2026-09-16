import { updateTag } from "next/cache";
import { z } from "zod";
import { DEPARTMENTS } from "@/lib/department";
import { CATALOG_TAG } from "@/lib/data/catalog";

export const departmentSchema = z.enum(DEPARTMENTS);

export function fail(message: string): { error: string } {
  return { error: message };
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
