import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFeaturedProducts, getPublishedSeries } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { mediaUrl } from "@/lib/supabase/storage";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { departmentCopy, isDepartment, seriesHref, seriesIndexHref, type Department } from "@/lib/department";

type Params = { department: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return { title: departmentCopy(department).label };
}

export default async function DepartmentHomePage({ params }: { params: Promise<Params> }) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;
  const copy = departmentCopy(department);

  const [series, featured] = await Promise.all([
    getPublishedSeries(department),
    getFeaturedProducts(department, 8),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-secondary/40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--foreground),transparent_94%),transparent_60%)]"
        />
        <Container className="relative flex flex-col gap-6 py-24 md:py-36">
          <Reveal>
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {copy.label}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="max-w-3xl font-heading text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-7xl md:text-8xl">
              {copy.heroLine}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              {copy.tagline}.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="flex gap-4 pt-2">
              <Link
                href={seriesIndexHref(department)}
                className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Browse {copy.seriesLabel.toLowerCase()}
              </Link>
            </div>
          </Reveal>
        </Container>
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {series.slice(0, 6).map((s, i) => (
                <Reveal key={s.id} delay={Math.min(i, 4) * 0.06}>
                  <Link
                    href={seriesHref(s)}
                    className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-border bg-muted transition-shadow duration-300 hover:shadow-xl"
                  >
                    {s.hero_image_url && (
                      <Image
                        src={mediaUrl(s.hero_image_url)}
                        alt={s.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    )}
                    <div className="relative z-10 bg-gradient-to-t from-black/75 via-black/10 to-transparent p-6 pt-20">
                      <h3 className="font-heading text-xl text-white">{s.name}</h3>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
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
