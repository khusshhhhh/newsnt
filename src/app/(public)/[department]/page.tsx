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
import { cn } from "@/lib/utils";
import {
  departmentCopy,
  isDepartment,
  seriesIndexHref,
  type Department,
} from "@/lib/department";

type Params = { department: string };

/**
 * Per-department hero visual. Sanitary & tapware's concept film (its
 * `chapters` label each finish, synced to playback by HeroMedia) now lives in
 * its own section below the hero rather than autoplaying in it; door hardware
 * keeps the still photography it already had, ken-burns'd for a bit of motion.
 */
const HERO_MEDIA: Record<
  Department,
  { video?: string; image?: string; alt: string; caption: string; chapters?: string[] }
> = {
  "sanitary-tapware": {
    video: "/videos/tapware-showcase-hero.mp4",
    alt: "Five tapware and shower finishes in motion — matte black, brushed gold, gun metal, brushed nickel, and satin chrome",
    caption: "Five finishes, in motion",
    chapters: ["Matte Black", "Brushed Gold", "Gun Metal", "Brushed Nickel", "Satin Chrome"],
  },
  "door-hardware": {
    image: "/images/door-hardware-hero.png",
    alt: "Matte black door lever handle in soft daylight",
    caption: "Hardware, framed in light",
  },
};

/** Swatches for the hero's finish strip, standing in for the video that used to live there. */
const HERO_FINISHES: Partial<Record<Department, { name: string; swatch: string }[]>> = {
  "sanitary-tapware": [
    { name: "Matte Black", swatch: "#1b1b1b" },
    { name: "Brushed Gold", swatch: "#b08d57" },
    { name: "Gun Metal", swatch: "#4b4f54" },
    { name: "Brushed Nickel", swatch: "#b8b7b2" },
    { name: "Satin Chrome", swatch: "#c8ccd0" },
  ],
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
  const finishes = HERO_FINISHES[department] ?? [];
  const hasFilm = Boolean(media.video);
  const stats = [
    { value: series?.length ?? 0, label: copy.seriesLabel },
    { value: categories.length, label: "Categories" },
    { value: featured.length, label: "Featured picks" },
  ].filter((stat) => stat.value > 0);

  return (
    <div>
      <section className={cn("relative overflow-hidden bg-background", !hasFilm && "border-b border-border")}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--foreground),transparent_94%),transparent_60%)]"
        />
        <Container
          className={cn(
            "relative py-20 md:py-28",
            hasFilm
              ? "flex flex-col items-start gap-10"
              : "grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14"
          )}
        >
          <div className={cn("flex flex-col gap-6", hasFilm && "max-w-3xl")}>
            <Reveal>
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {copy.label}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1
                className={cn(
                  "max-w-xl font-heading font-black leading-[0.95] tracking-tight text-foreground",
                  hasFilm
                    ? "max-w-2xl text-6xl sm:text-7xl md:text-8xl"
                    : "text-5xl sm:text-6xl md:text-7xl"
                )}
              >
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
                {hasFilm && (
                  <a
                    href="#concept-film"
                    className="rounded-full border border-border px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Watch the concept film
                  </a>
                )}
              </div>
            </Reveal>
            {finishes.length > 0 && (
              <Reveal delay={0.32}>
                <ul className="flex flex-wrap items-center gap-5 border-t border-border pt-6">
                  {finishes.map((finish) => (
                    <li key={finish.name} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-3 rounded-full ring-1 ring-border ring-offset-1 ring-offset-background"
                        style={{ background: finish.swatch }}
                      />
                      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        {finish.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            {stats.length > 0 && (
              <Reveal delay={0.4}>
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

          {!hasFilm && (
            <Reveal delay={0.16}>
              <HeroMedia
                imageSrc={media.image}
                imageAlt={media.alt}
                caption={media.caption}
              />
            </Reveal>
          )}
        </Container>
      </section>

      {hasFilm && (
        <section id="concept-film" className="scroll-mt-24 bg-background py-16 md:py-24">
          <Container>
            <Reveal className="mx-auto mb-10 max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Concept film
              </span>
              <h2 className="mt-3 font-heading text-3xl text-foreground md:text-4xl">
                {media.caption}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <HeroMedia
                videoSrc={media.video}
                imageAlt={media.alt}
                caption={media.caption}
                chapters={media.chapters}
                lazyPlay
                className="aspect-video w-full rounded-[1.5rem] sm:aspect-video md:aspect-video md:rounded-[2rem]"
              />
            </Reveal>
          </Container>
        </section>
      )}

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
