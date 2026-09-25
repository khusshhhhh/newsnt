import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveFinishes, getProducts, getSeriesBySlug } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { ProductCard } from "@/components/product-card";
import { ImageSlider } from "@/components/image-slider";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { FinishFilterPills } from "@/components/finish-filter-pills";
import { EmptyListing } from "@/components/empty-listing";
import { ListingControls } from "@/components/listing-controls";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { listingHref, parseListing, type ListingSearchParams } from "@/lib/listing";
import { isDepartment, seriesHref, seriesIndexHref, type Department } from "@/lib/department";

type Params = { department: string; seriesSlug: string };
type SearchParams = ListingSearchParams;

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
    alternates: { canonical: seriesHref(series) },
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

  const { page, finish: finishCode, sort, inStockOnly } = parseListing(await searchParams);
  const basePath = seriesHref(series);

  const [{ items: products, pageCount, total }, finishes] = await Promise.all([
    getProducts(department, { seriesSlug, finishCode }, page, { sort, inStockOnly }),
    getActiveFinishes(),
  ]);

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
        <Breadcrumbs items={[{ name: "Series", href: seriesIndexHref(department) }, { name: series.name }]} />
        <FinishFilterPills
          finishes={finishes}
          basePath={basePath}
          activeCode={finishCode}
          hrefFor={(finish) => listingHref(basePath, { finish, sort, inStockOnly })}
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
            No products published in this series yet.
          </EmptyListing>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          buildHref={(p) => listingHref(basePath, { finish: finishCode, sort, inStockOnly, page: p })}
        />
      </Container>
    </div>
  );
}
