/**
 * The fixed finish palette every product variant is chosen from. Locked to
 * these six (no free-typed colors) so each one maps to a predictable
 * 2-letter code for SKU generation.
 */
export const PRODUCT_COLORS = [
  { name: "Matte Black", code: "MB", hex: "#1C1C1C" },
  { name: "Brushed Gold", code: "BG", hex: "#B08D57" },
  { name: "Brushed Bronze", code: "BB", hex: "#7C5A43" },
  { name: "Brushed Nickel", code: "BN", hex: "#9C9C94" },
  { name: "Satin Chrome", code: "SC", hex: "#C9CDD1" },
  { name: "Gun Metal", code: "GM", hex: "#3A3D40" },
] as const;

export type ProductColorName = (typeof PRODUCT_COLORS)[number]["name"];

export const PRODUCT_COLOR_NAMES = PRODUCT_COLORS.map((c) => c.name) as [
  ProductColorName,
  ...ProductColorName[],
];

export const DEFAULT_COLOR_NAME: ProductColorName = "Matte Black";

export function colorCode(name: string): string | null {
  return PRODUCT_COLORS.find((c) => c.name === name)?.code ?? null;
}

export function colorHex(name: string): string | null {
  return PRODUCT_COLORS.find((c) => c.name === name)?.hex ?? null;
}

/** Builds a color variant's SKU from the product's SKU prefix, e.g. "AKRLTS001" + "Matte Black" -> "AKRLTS001MB". */
export function computeVariantSku(prefix: string, colorName: string): string {
  const code = colorCode(colorName) ?? "";
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
