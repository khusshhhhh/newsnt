export const LISTING_SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A–Z",
} as const;

export type ListingSort = keyof typeof LISTING_SORTS;

export type ListingOptions = { sort: ListingSort; inStockOnly: boolean };

export type ListingSearchParams = { page?: string; finish?: string; sort?: string; stock?: string };

export function parseListing(sp: ListingSearchParams): ListingOptions & { page: number; finish?: string } {
  const sort = sp.sort && sp.sort in LISTING_SORTS ? (sp.sort as ListingSort) : "featured";
  return {
    page: Math.max(1, Number(sp.page) || 1),
    finish: sp.finish || undefined,
    sort,
    inStockOnly: sp.stock === "in",
  };
}

/** A listing URL with only the non-default params, so links stay short and shareable. */
export function listingHref(
  basePath: string,
  params: { finish?: string; sort?: ListingSort; inStockOnly?: boolean; page?: number }
) {
  const qs = new URLSearchParams();
  if (params.finish) qs.set("finish", params.finish);
  if (params.sort && params.sort !== "featured") qs.set("sort", params.sort);
  if (params.inStockOnly) qs.set("stock", "in");
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
