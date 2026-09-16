import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { searchProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { SearchBox } from "@/components/search-box";
import { isDepartment, searchHref, type Department } from "@/lib/department";

type Params = { department: string };
type SearchParams = { q?: string; page?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return { title: "Search" };
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
  const { items: products, total, pageCount } = q
    ? await searchProducts(department, q, page)
    : { items: [], total: 0, pageCount: 1 };

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
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nothing matched — try a different name, SKU, or keyword.
            </p>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            buildHref={(p) => `${searchHref(department, q)}&page=${p}`}
          />
        </>
      ) : (
        <p className="text-muted-foreground">Start typing to search the catalog.</p>
      )}
    </Container>
  );
}
