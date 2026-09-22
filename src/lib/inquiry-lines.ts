import type { Department } from "@/lib/department";
import type { Inquiry } from "@/lib/supabase/types";

export type AdminInquiryProductVariant = {
  id: string;
  color_name: string;
  sku: string | null;
  price: number | null;
};

export type AdminInquiryProduct = {
  id: string;
  name: string;
  slug: string;
  department: Department;
  sku: string | null;
  price: number | null;
  series: { name: string } | null;
  category: { name: string } | null;
  product_images: { storage_path: string; display_order: number }[];
  variants: AdminInquiryProductVariant[];
};

export type ResolvedInquiryLine = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  seriesName: string | null;
  categoryName: string | null;
  department: Department;
  slug: string;
  imagePath: string | null;
  quantity: number;
  unitPrice: number | null;
};

/**
 * Resolves an inquiry's product references into full display-ready lines.
 * Prefers the structured `items` column (product + variant + quantity);
 * falls back to tallying the legacy `product_ids` (a bare id repeated once
 * per unit, no variant) for inquiries submitted before `items` existed.
 */
export function resolveInquiryLines(
  inquiry: Pick<Inquiry, "items" | "product_ids">,
  productsById: Map<string, AdminInquiryProduct>
): ResolvedInquiryLine[] {
  function toLine(
    product: AdminInquiryProduct,
    variantId: string | null,
    quantity: number
  ): ResolvedInquiryLine {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
    const image = [...product.product_images].sort((a, b) => a.display_order - b.display_order)[0];
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantLabel: variant?.color_name ?? null,
      sku: variant?.sku ?? product.sku,
      seriesName: product.series?.name ?? null,
      categoryName: product.category?.name ?? null,
      department: product.department,
      slug: product.slug,
      imagePath: image?.storage_path ?? null,
      quantity,
      unitPrice: variant?.price ?? product.price,
    };
  }

  if (inquiry.items && inquiry.items.length > 0) {
    return inquiry.items
      .map((item) => {
        const product = productsById.get(item.product_id);
        return product ? toLine(product, item.variant_id, item.quantity) : null;
      })
      .filter((line): line is ResolvedInquiryLine => line !== null);
  }

  const quantitiesById = new Map<string, number>();
  for (const id of inquiry.product_ids ?? []) {
    quantitiesById.set(id, (quantitiesById.get(id) ?? 0) + 1);
  }
  return Array.from(quantitiesById.entries())
    .map(([id, quantity]) => {
      const product = productsById.get(id);
      return product ? toLine(product, null, quantity) : null;
    })
    .filter((line): line is ResolvedInquiryLine => line !== null);
}
