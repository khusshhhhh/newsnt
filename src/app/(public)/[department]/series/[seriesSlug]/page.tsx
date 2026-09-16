import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getProductCategoryIds, getProducts, getSeriesBySlug } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { ProductCard } from "@/components/product-card";
import { ImageSlider } from "@/components/image-slider";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { isDepartment, seriesCategoryHref, type Department } from "@/lib/department";

type Params = { department: string; seriesSlug: string };
type SearchParams = { page?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, seriesSlug } = await params;
  if (!isDepartment(department)) return {};
  const series = await getSeriesBySlug(department, seriesSlug);
  if (!series) return { title: "Series" };

  return {
    title: series.name,
    description: series.design_story ?? undefined,
    openGraph: {
      title: series.name,
      description: series.design_story ?? undefined,
      images: series.hero_image_url ? [{ url: mediaUrl(series.hero_image_url) }] : undefined,
    },
  };
}

export default async function SeriesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw, seriesSlug } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const series = await getSeriesBySlug(department, seriesSlug);
  if (!series) notFound();

  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const [categories, { items: products, pageCount }, categoryIdsWithProducts] = await Promise.all([
    getCategories(department),
    getProducts(department, { seriesSlug }, page),
    getProductCategoryIds(department, { seriesSlug }),
  ]);
  const categoriesWithProducts = new Set(categoryIdsWithProducts);

  // Falls back to the single legacy `hero_image_url` for series saved
  // before the gallery uploader existed and never re-saved since.
  const heroImages = series.images.length > 0
    ? series.images.map((image) => mediaUrl(image.storage_path))
    : series.hero_image_url
      ? [mediaUrl(series.hero_image_url)]
      : [];

  return (
    <div>
      <section className="relative flex h-[65vh] min-h-[480px] items-end overflow-hidden border-b border-border bg-background">
        {heroImages.length > 0 && (
          <ImageSlider
            images={heroImages}
            alt={series.name}
            sizes="100vw"
            priority
            dots={heroImages.length > 1}
          />
        )}
        <div className="relative z-10 w-full bg-gradient-to-t from-black/85 via-black/25 to-transparent py-10">
          <Container>
            <h1 className="font-heading text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              {series.name}
            </h1>
            {series.design_story && (
              <p className="mt-3 max-w-xl text-white/85">{series.design_story}</p>
            )}
          </Container>
        </div>
      </section>

      <Container className="py-12">
        {categories && categories.length > 0 && (
          <Reveal className="mb-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {categories
              .filter((c) => categoriesWithProducts.has(c.id))
              .map((c) => (
                <Link
                  key={c.id}
                  href={seriesCategoryHref(series, c)}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-border/60 bg-card"
                >
                  {c.images.length > 0 ? (
                    <ImageSlider
                      images={c.images.map((image) => mediaUrl(image.storage_path))}
                      alt={c.name}
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--foreground),transparent_95%),transparent_60%)]"
                    />
                  )}
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/15 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                  <span className="relative z-20 p-4 font-heading text-sm font-bold tracking-tight text-white sm:text-base">
                    {c.name}
                  </span>
                </Link>
              ))}
          </Reveal>
        )}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, i) => (
              <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No products published in this series yet.</p>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          buildHref={(p) => `/${department}/series/${seriesSlug}?page=${p}`}
        />
      </Container>
    </div>
  );
}
