import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getProductCategoryIds, getProducts, getSeriesBySlug } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { ProductCard } from "@/components/product-card";
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

  const [categories, { items: products, pageCount }, categoriesWithProducts] = await Promise.all([
    getCategories(department),
    getProducts(department, { seriesSlug }, page),
    getProductCategoryIds(department, { seriesSlug }),
  ]);

  return (
    <div>
      <section className="relative flex h-[45vh] min-h-80 items-end overflow-hidden border-b border-border bg-background">
        {series.hero_image_url && (
          <Image
            src={mediaUrl(series.hero_image_url)}
            alt={series.name}
            fill
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
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
          <Reveal className="mb-10 flex flex-wrap gap-2">
            {categories
              .filter((c) => categoriesWithProducts.has(c.id))
              .map((c) => (
                <Link
                  key={c.id}
                  href={seriesCategoryHref(series, c)}
                  className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {c.name}
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
