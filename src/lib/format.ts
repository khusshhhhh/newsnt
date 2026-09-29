import type { ProductWithRelations } from "@/lib/supabase/types";

/** Currency is locked to AUD everywhere (see products_currency_aud_check). */
export function formatPrice(price: number | null) {
  if (price == null) return "Price on enquiry";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `A$${price.toLocaleString("en-AU")}`;
  }
}

/** Like formatPrice but keeps cents when there are any — for discounts and discounted totals, where rounding to the dollar would misstate them. */
export function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "From {min}" when colours are priced differently, the single shared price when they match, or the product's fallback price. */
export function productPriceLabel(product: Pick<ProductWithRelations, "price" | "variants">) {
  const variantPrices = (product.variants ?? [])
    .map((v) => v.price)
    .filter((p): p is number => p != null);

  if (variantPrices.length === 0) return formatPrice(product.price);

  const min = Math.min(...variantPrices);
  const max = Math.max(...variantPrices);
  return min === max ? formatPrice(min) : `From ${formatPrice(min)}`;
}
