/**
 * The finish palette itself now lives in the `finishes` table (admin-managed
 * at /admin/finishes, since the lineup changes roughly monthly) rather than
 * a hardcoded array — see supabase/migrations/0018_finishes.sql, seeded with
 * the 6 finishes this file used to hardcode. This file keeps only the
 * variant-selection logic that doesn't depend on the specific palette.
 */

export const DEFAULT_COLOR_NAME = "Matte Black";

/** Builds a color variant's SKU from the product's SKU prefix and the finish's code, e.g. "AKRLTS001" + "MB" -> "AKRLTS001MB". */
export function computeVariantSku(prefix: string, code: string): string {
  return `${prefix}${code}`;
}

/**
 * The variant a product page should show on first load: Matte Black if the
 * product has it, otherwise the first color by display order, otherwise
 * null (no colors at all — falls back to the product's general gallery).
 */
export function getDefaultVariant<T extends { color_name: string; display_order: number }>(
  variants: T[]
): T | null {
  if (variants.length === 0) return null;
  const matteBlack = variants.find((v) => v.color_name === DEFAULT_COLOR_NAME);
  if (matteBlack) return matteBlack;
  return [...variants].sort((a, b) => a.display_order - b.display_order)[0];
}
