import Image from "next/image";
import Link from "next/link";
import { getFeaturedProducts, getPublishedSeries } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { mediaUrl } from "@/lib/supabase/storage";

export default async function HomePage() {
  const [series, featured] = await Promise.all([
    getPublishedSeries(),
    getFeaturedProducts(8),
  ]);

  return (
    <div>
      <section className="border-b border-border/70 bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-24 sm:px-6 md:py-32">
          <span className="text-sm uppercase tracking-[0.2em] text-primary">
            Tapware &amp; Sanitaryware
          </span>
          <h1 className="max-w-2xl font-heading text-4xl leading-tight text-foreground sm:text-5xl md:text-6xl">
            Six series. One design language, refined six ways.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Basin mixers, kitchen mixers, taps and showers — each series
            carries its own design story, consistent across every finish.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/series"
              className="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse the series
            </Link>
          </div>
        </div>
      </section>

      {series && series.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-heading text-2xl text-foreground">Series</h2>
            <Link href="/series" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {series.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                href={`/series/${s.slug}`}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-border/70 bg-muted p-6"
              >
                {s.hero_image_url && (
                  <Image
                    src={mediaUrl(s.hero_image_url)}
                    alt={s.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="relative z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 pt-16 -m-6">
                  <h3 className="font-heading text-xl text-white">{s.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 font-heading text-2xl text-foreground">
            Featured products
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
