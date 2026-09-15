import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryBySlug,
  getProducts,
  getSeriesBySlug,
} from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";

type Params = { seriesSlug: string; categorySlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { seriesSlug, categorySlug } = await params;
  const [series, category] = await Promise.all([
    getSeriesBySlug(seriesSlug),
    getCategoryBySlug(categorySlug),
  ]);
  return { title: `${category?.name ?? ""} — ${series?.name ?? ""}` };
}

export default async function SeriesCategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { seriesSlug, categorySlug } = await params;
  const [series, category] = await Promise.all([
    getSeriesBySlug(seriesSlug),
    getCategoryBySlug(categorySlug),
  ]);
  if (!series || !category) notFound();

  const products = await getProducts({ seriesSlug, categorySlug });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/series" className="hover:text-foreground">
          Series
        </Link>
        <span>/</span>
        <Link href={`/series/${series.slug}`} className="hover:text-foreground">
          {series.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </div>

      <h1 className="mb-8 font-heading text-3xl text-foreground">
        {category.name} — {series.name}
      </h1>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No {category.name.toLowerCase()} published in {series.name} yet.
        </p>
      )}
    </div>
  );
}
