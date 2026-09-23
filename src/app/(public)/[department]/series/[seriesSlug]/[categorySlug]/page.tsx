import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveFinishes, getCategoryBySlug, getProducts, getSeriesBySlug } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { FinishFilterPills } from "@/components/finish-filter-pills";
import { isDepartment, seriesIndexHref, seriesHref, type Department } from "@/lib/department";

type Params = { department: string; seriesSlug: string; categorySlug: string };
type SearchParams = { page?: string; finish?: string };

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

  const { page: rawPage, finish: finishCode } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const [{ items: products, pageCount }, finishes] = await Promise.all([
    getProducts(department, { seriesSlug, categorySlug, finishCode }, page),
    getActiveFinishes(),
  ]);
  const basePath = `/${department}/series/${seriesSlug}/${categorySlug}`;

  return (
    <Container className="py-12">
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={seriesIndexHref(department)} className="transition-colors hover:text-foreground">
          Series
        </Link>
        <span>/</span>
        <Link href={seriesHref(series)} className="transition-colors hover:text-foreground">
          {series.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </div>

      <h1 className="mb-8 font-heading text-3xl text-foreground">
        {category.name} — {series.name}
      </h1>

      <FinishFilterPills finishes={finishes} basePath={basePath} activeCode={finishCode} />

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
          No {category.name.toLowerCase()} published in {series.name} yet.
        </p>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(p) => `${basePath}?page=${p}${finishCode ? `&finish=${finishCode}` : ""}`}
      />
    </Container>
  );
}
