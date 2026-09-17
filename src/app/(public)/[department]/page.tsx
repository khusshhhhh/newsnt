import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, getFeaturedProducts, getPublishedSeries } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { ProductCard } from "@/components/product-card";
import { SeriesCarousel } from "@/components/series-carousel";
import { HeroMedia } from "@/components/hero-media";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import {
  departmentCopy,
  isDepartment,
  seriesHref,
  seriesIndexHref,
  type Department,
} from "@/lib/department";

type Params = { department: string };

/**
 * Per-department hero visual. Sanitary & tapware gets an ambient AI-generated
 * concept video (there's no real product footage yet); door hardware keeps
 * the still photography it already had, ken-burns'd for a bit of motion.
 */
const HERO_MEDIA: Record<
  Department,
  { video?: string; image?: string; alt: string; caption: string }
> = {
  "sanitary-tapware": {
    video: "/videos/tapware-hero.mp4",
    alt: "Water flowing from a matte black basin mixer tap onto travertine stone",
    caption: "Basin mixers, in motion",
  },
  "door-hardware": {
    image: "/images/door-hardware-hero.png",
    alt: "Matte black door lever handle in soft daylight",
    caption: "Hardware, framed in light",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  const copy = departmentCopy(department);
  const series = await getPublishedSeries(department);
  const heroImage = series?.find((s) => s.hero_image_url)?.hero_image_url;

  return {
    title: copy.label,
    description: copy.tagline,
    openGraph: {
      title: copy.label,
      description: copy.tagline,
      images: heroImage ? [{ url: mediaUrl(heroImage) }] : undefined,
    },
  };
}

export default async function DepartmentHomePage({ params }: { params: Promise<Params> }) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;
  const copy = departmentCopy(department);

  const [series, featured, categories] = await Promise.all([
    getPublishedSeries(department),
    getFeaturedProducts(department, 8),
    getCategories(department),
  ]);

  const media = HERO_MEDIA[department];
  const stats = [
    { value: series?.length ?? 0, label: copy.seriesLabel },
    { value: categories.length, label: "Categories" },
    { value: featured.length, label: "Featured picks" },
  ].filter((stat) => stat.value > 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--foreground),transparent_94%),transparent_60%)]"
        />
        <Container className="relative grid gap-12 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div className="flex flex-col gap-6">
            <Reveal>
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {copy.label}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="max-w-xl font-heading text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl">
                {copy.heroLine}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                {copy.tagline}.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href={seriesIndexHref(department)}
                  className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  Browse {copy.seriesLabel.toLowerCase()}
                </Link>
              </div>
            </Reveal>
            {stats.length > 0 && (
              <Reveal delay={0.32}>
                <dl className="mt-2 flex max-w-md gap-8 border-t border-border pt-6">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="font-heading text-3xl font-black text-foreground">
                        {stat.value}
                      </dd>
                      <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.16}>
            <HeroMedia
              videoSrc={media.video}
              imageSrc={media.image}
              imageAlt={media.alt}
              caption={media.caption}
            />
          </Reveal>
        </Container>

        {series && series.length > 0 && (
          <div className="relative border-t border-border py-4">
            <div className="no-scrollbar flex w-max animate-marquee gap-10 whitespace-nowrap px-6 hover:[animation-play-state:paused]">
              {[...series, ...series].map((s, i) => (
                <Link
                  key={`${s.id}-${i}`}
                  href={seriesHref(s)}
                  className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {series && series.length > 0 && (
        <section className="py-16 md:py-24">
          <Container>
            <Reveal className="mb-8 flex items-end justify-between">
              <h2 className="font-heading text-3xl text-foreground">{copy.seriesLabel}</h2>
              <Link
                href={seriesIndexHref(department)}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                View all
              </Link>
            </Reveal>
            <SeriesCarousel series={series} />
          </Container>
        </section>
      )}

      {featured.length > 0 && (
        <section className="border-t border-border py-16 md:py-24">
          <Container>
            <Reveal>
              <h2 className="mb-8 font-heading text-3xl text-foreground">
                Featured
              </h2>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {(!series || series.length === 0) && featured.length === 0 && (
        <Container className="py-24 text-center">
          <p className="text-muted-foreground">
            This department is being set up — check back soon, or add the first{" "}
            {copy.seriesLabel.toLowerCase()} from the admin panel.
          </p>
        </Container>
      )}
    </div>
  );
}
