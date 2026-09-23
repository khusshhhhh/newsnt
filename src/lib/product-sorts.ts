export const PRODUCT_SORTS = {
  newest: { column: "created_at", ascending: false, label: "Newest" },
  oldest: { column: "created_at", ascending: true, label: "Oldest" },
  "name-asc": { column: "name", ascending: true, label: "Name A–Z" },
  "name-desc": { column: "name", ascending: false, label: "Name Z–A" },
  "price-asc": { column: "price", ascending: true, label: "Price low–high" },
  "price-desc": { column: "price", ascending: false, label: "Price high–low" },
} as const;

export type ProductSort = keyof typeof PRODUCT_SORTS;

export function isProductSort(value: string): value is ProductSort {
  return value in PRODUCT_SORTS;
}
