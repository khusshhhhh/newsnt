import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveFinishes, getFinishCounts, getCategoryBySlug, getProducts, getSeriesBySlug } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { FinishFilterPills } from "@/components/finish-filter-pills";
import { EmptyListing } from "@/components/empty-listing";
import { ListingControls } from "@/components/listing-controls";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { listingHref, parseListing, type ListingSearchParams } from "@/lib/listing";
import { isDepartment, seriesIndexHref, seriesHref, type Department } from "@/lib/department";

type Params = { department: string; seriesSlug: string; categorySlug: string };
type SearchParams = ListingSearchParams;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, seriesSlug, categorySlug } = await params;
  if (!isDepartment(department)) return {};
  const [series, category] = await Promise.all([
    getSeriesBySlug(department, seriesSlug),
    getCategoryBySlug(department, categorySlug),
  ]);
  return { title: `${category?.name ?? ""} — ${series?.name ?? ""}` };
}

export default async function SeriesCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw, seriesSlug, categorySlug } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const [series, category] = await Promise.all([
    getSeriesBySlug(department, seriesSlug),
    getCategoryBySlug(department, categorySlug),
  ]);
  if (!series || !category) notFound();

  const { page, finish: finishCode, sort, inStockOnly } = parseListing(await searchParams);
  const [{ items: products, pageCount, total }, finishes, finishCounts] = await Promise.all([
    getProducts(department, { seriesSlug, categorySlug, finishCode }, page, { sort, inStockOnly }),
    getActiveFinishes(),
    getFinishCounts(department, { seriesSlug, categorySlug }, inStockOnly),
  ]);
  const basePath = `/${department}/series/${seriesSlug}/${categorySlug}`;

  return (
    <Container className="py-12">
      <Breadcrumbs
        items={[
          { name: "Series", href: seriesIndexHref(department) },
          { name: series.name, href: seriesHref(series) },
          { name: category.name },
        ]}
      />

      <h1 className="mb-8 font-heading text-3xl text-foreground">
        {category.name} — {series.name}
      </h1>

      <FinishFilterPills
        finishes={finishes}
        basePath={basePath}
        activeCode={finishCode}
        hrefFor={(finish) => listingHref(basePath, { finish, sort, inStockOnly })}
        counts={finishCounts}
      />
      <ListingControls sort={sort} inStockOnly={inStockOnly} total={total} />

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
              <ProductCard
                product={product}
                preferredColorName={finishes.find((f) => f.code === finishCode)?.name}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyListing filtered={Boolean(finishCode || inStockOnly)} resetHref={basePath}>
          No {category.name.toLowerCase()} published in {series.name} yet.
        </EmptyListing>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(p) => listingHref(basePath, { finish: finishCode, sort, inStockOnly, page: p })}
      />
    </Container>
  );
}
