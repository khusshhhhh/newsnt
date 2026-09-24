import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getPublishedSeries, searchProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { SearchBox } from "@/components/search-box";
import { categoryHref, isDepartment, searchHref, seriesHref, type Department } from "@/lib/department";

type Params = { department: string };
type SearchParams = { q?: string; page?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return { title: "Search", robots: { index: false, follow: true } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const { q = "", page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const [{ items: products, total, pageCount }, series, categories] = await Promise.all([
    q ? searchProducts(department, q, page) : Promise.resolve({ items: [], total: 0, pageCount: 1 }),
    getPublishedSeries(department),
    getCategories(department),
  ]);
  // Series/categories whose name matches, shown as quick links above the products.
  const lower = q.trim().toLowerCase();
  const matchingSeries = lower ? (series ?? []).filter((s) => s.name.toLowerCase().includes(lower)) : [];
  const matchingCategories = lower ? (categories ?? []).filter((c) => c.name.toLowerCase().includes(lower)) : [];
  const browse = (
    <div className="mt-6 flex flex-col gap-4 text-sm">
      {(categories ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-muted-foreground">Browse by category</p>
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).slice(0, 10).map((c) => (
              <Link key={c.id} href={categoryHref(c)} className="rounded-full border border-border px-3 py-1.5 text-foreground transition-colors hover:border-foreground">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {(series ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-muted-foreground">Or by series</p>
          <div className="flex flex-wrap gap-2">
            {(series ?? []).slice(0, 10).map((s) => (
              <Link key={s.id} href={seriesHref(s)} className="rounded-full border border-border px-3 py-1.5 text-foreground transition-colors hover:border-foreground">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Container className="py-12">
      <SearchBox department={department} initialQuery={q} />

      {q ? (
        <>
          <Reveal>
            <p className="mb-8 text-sm text-muted-foreground">
              {total} result{total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
            </p>
          </Reveal>
          {(matchingSeries.length > 0 || matchingCategories.length > 0) && (
            <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Jump to:</span>
              {matchingSeries.map((s) => (
                <Link key={s.id} href={seriesHref(s)} className="rounded-full bg-muted px-3 py-1 text-foreground hover:bg-accent">
                  {s.name} series
                </Link>
              ))}
              {matchingCategories.map((c) => (
                <Link key={c.id} href={categoryHref(c)} className="rounded-full bg-muted px-3 py-1 text-foreground hover:bg-accent">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
                  <ProductCard product={product} eager={i < 4} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground">
                Nothing matched &ldquo;{q}&rdquo; — try a shorter word, a product name, or a SKU.
              </p>
              {browse}
            </div>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            buildHref={(p) => `${searchHref(department, q)}&page=${p}`}
          />
        </>
      ) : (
        <div>
          <p className="text-muted-foreground">Start typing to search the catalog — small typos are fine.</p>
          {browse}
        </div>
      )}
    </Container>
  );
}
