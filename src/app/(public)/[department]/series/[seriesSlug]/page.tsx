import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getProducts, getSeriesBySlug } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { isDepartment, seriesCategoryHref, type Department } from "@/lib/department";

type Params = { department: string; seriesSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, seriesSlug } = await params;
  if (!isDepartment(department)) return {};
  const series = await getSeriesBySlug(department, seriesSlug);
  return { title: series?.name ?? "Series" };
}

export default async function SeriesDetailPage({ params }: { params: Promise<Params> }) {
  const { department: raw, seriesSlug } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const series = await getSeriesBySlug(department, seriesSlug);
  if (!series) notFound();

  const [categories, products] = await Promise.all([
    getCategories(department),
    getProducts(department, { seriesSlug }),
  ]);

  const categoriesWithProducts = new Set(products.map((p) => p.category_id));

  return (
    <div>
      <section className="relative flex h-[45vh] min-h-80 items-end overflow-hidden border-b border-border bg-muted">
        {series.hero_image_url && (
          <Image
            src={mediaUrl(series.hero_image_url)}
            alt={series.name}
            fill
            priority
            className="object-cover"
          />
        )}
        <div className="relative z-10 w-full bg-gradient-to-t from-black/85 via-black/25 to-transparent py-10">
          <Container>
            <h1 className="font-heading text-4xl text-white sm:text-5xl">{series.name}</h1>
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
      </Container>
    </div>
  );
}
