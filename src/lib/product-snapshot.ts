import { getDefaultVariant } from "@/lib/colors";
import { isDepartment, type Department } from "@/lib/department";
import { productPriceLabel } from "@/lib/format";
import type { ProductVariantWithImages, ProductWithRelations } from "@/lib/supabase/types";

/**
 * Enough of a product to draw a small card without fetching it again — what
 * the browser-only lists (recently viewed, saved) keep. A renamed or
 * unpublished product can linger in them until it's seen again, which is
 * fine for a convenience list (its link 404s politely).
 */
export type ProductSnapshot = {
  productId: string;
  department: Department;
  slug: string;
  name: string;
  seriesName: string | null;
  imagePath: string | null;
  priceLabel: string;
};

/** Snapshot of `product`, pictured in `variant` when given (else its default colour). */
export function productSnapshot(
  product: ProductWithRelations,
  variant?: ProductVariantWithImages | null
): ProductSnapshot {
  const variants = product.variants ?? [];
  const image =
    variant?.product_images[0] ??
    getDefaultVariant(variants)?.product_images[0] ??
    product.product_images?.[0] ??
    variants.find((v) => v.product_images.length > 0)?.product_images[0];
  return {
    productId: product.id,
    department: product.department,
    slug: product.slug,
    name: product.name,
    seriesName: product.series?.name ?? null,
    imagePath: image?.storage_path ?? null,
    priceLabel: productPriceLabel(product),
  };
}

export function isProductSnapshot(item: unknown): item is ProductSnapshot {
  if (!item || typeof item !== "object") return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.productId === "string" &&
    typeof i.slug === "string" &&
    typeof i.name === "string" &&
    typeof i.priceLabel === "string" &&
    typeof i.department === "string" &&
    isDepartment(i.department)
  );
}
