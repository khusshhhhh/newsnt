import { NextResponse, type NextRequest } from "next/server";
import { getCategories, getPublishedSeries, searchProducts } from "@/lib/data/catalog";
import { categoryHref, isDepartment, seriesHref } from "@/lib/department";
import { productSnapshot } from "@/lib/product-snapshot";
import type { SearchSuggestions } from "@/lib/search-suggestions";

const MAX_PRODUCTS = 6;
const MAX_COLLECTIONS = 4;

/**
 * Type-ahead results for the header search: the top few products (same
 * typo-tolerant ranking as the search page) plus matching series and
 * categories. Public catalog data only, so identical queries are cached at the
 * CDN for a few minutes rather than hitting the database on every keystroke.
 */
export async function GET(request: NextRequest) {
  const department = request.nextUrl.searchParams.get("department") ?? "";
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!isDepartment(department)) {
    return NextResponse.json({ error: "Unknown department" }, { status: 400 });
  }

  if (query.length < 2) {
    return NextResponse.json({ products: [], collections: [], total: 0 } satisfies SearchSuggestions);
  }

  const [results, series, categories] = await Promise.all([
    searchProducts(department, query, 1),
    getPublishedSeries(department),
    getCategories(department),
  ]);
  const lower = query.toLowerCase();
  const collections: SearchSuggestions["collections"] = [
    ...(series ?? [])
      .filter((s) => s.name.toLowerCase().includes(lower))
      .map((s) => ({ kind: "series" as const, name: s.name, href: seriesHref(s) })),
    ...(categories ?? [])
      .filter((c) => c.name.toLowerCase().includes(lower))
      .map((c) => ({ kind: "category" as const, name: c.name, href: categoryHref(c) })),
  ].slice(0, MAX_COLLECTIONS);

  const body: SearchSuggestions = {
    products: results.items.slice(0, MAX_PRODUCTS).map((p) => productSnapshot(p)),
    collections,
    total: results.total,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
