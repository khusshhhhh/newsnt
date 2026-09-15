import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategories,
  getProducts,
  getSeriesBySlug,
} from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { ProductCard } from "@/components/product-card";

type Params = { seriesSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { seriesSlug } = await params;
  const series = await getSeriesBySlug(seriesSlug);
  return { title: series?.name ?? "Series" };
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { seriesSlug } = await params;
  const series = await getSeriesBySlug(seriesSlug);
  if (!series) notFound();

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ seriesSlug }),
  ]);

  const categoriesWithProducts = new Set(products.map((p) => p.category_id));

  return (
    <div>
      <section className="relative flex h-[45vh] min-h-80 items-end overflow-hidden border-b border-border/70 bg-muted">
        {series.hero_image_url && (
          <Image
            src={mediaUrl(series.hero_image_url)}
            alt={series.name}
            fill
            priority
            className="object-cover"
          />
        )}
        <div className="relative z-10 w-full bg-gradient-to-t from-black/80 via-black/20 to-transparent px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h1 className="font-heading text-4xl text-white sm:text-5xl">
              {series.name}
            </h1>
            {series.design_story && (
              <p className="mt-3 max-w-xl text-white/85">{series.design_story}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {categories && categories.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2">
            {categories
              .filter((c) => categoriesWithProducts.has(c.id))
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/series/${series.slug}/${c.slug}`}
                  className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        )}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No products published in this series yet.
          </p>
        )}
      </div>
    </div>
  );
}
