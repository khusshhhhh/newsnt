import type { ProductSnapshot } from "@/lib/product-snapshot";

/** What /api/search returns for the header's type-ahead. */
export type SearchSuggestions = {
  products: ProductSnapshot[];
  /** Series and categories whose name matches, as quick links. */
  collections: { kind: "series" | "category"; name: string; href: string }[];
  /** How many products matched in all — the full results page shows them. */
  total: number;
};

/** Dispatch on window to open the header search from anywhere (the "/" shortcut). */
export const OPEN_SEARCH_EVENT = "storefront-search-open";
