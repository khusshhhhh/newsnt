import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, getPublishedSeries } from "@/lib/data/catalog";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import {
  DEPARTMENTS,
  departmentCopy,
  departmentHref,
  isDepartment,
  seriesIndexHref,
  type Department,
} from "@/lib/department";

type Params = { department: string };

const FOUNDERS: Array<{
  name: string;
  initials: string;
  role: string;
  note: string;
  photo?: string;
}> = [
  {
    name: "Hiral Mahida",
    initials: "HM",
    role: "Founder, Operations & Manufacturing",
    note: "Turns a drawing into a product that survives daily use, on time, at the tolerance it was drawn to.",
    photo: "/images/hiralpro.png",
  },
  {
    name: "Khush Patel",
    initials: "KP",
    role: "Administration",
    note: "",
    photo: "/images/khushpro.png",
  },
  {
    name: "Vivek Virani",
    initials: "VV",
    role: "Sales",
    note: "",
    photo: "/images/vivekpro.png",
  },
];

const MANIFESTO = [
  {
    index: "01",
    title: "One language, six ways to say it",
    body: "Every series shares the same grammar — the same radii, the same weight in the hand — so a basin mixer from one series and a shower system from another still look like they were drawn by the same person.",
  },
  {
    index: "02",
    title: "Built for the wet room, not the showroom",
    body: "A tap gets touched with wet hands, in bad light, for twenty years. We design for that morning, not the photograph.",
  },
  {
    index: "03",
    title: "Restraint is the hard part",
    body: "Anyone can add a detail. The work is deciding which ones earn their place — on the hardware, and on the page you're reading this from.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return {
    title: `About — ${departmentCopy(department).label}`,
    description: "The people and the philosophy behind Flow.",
  };
}

export default async function AboutPage({ params }: { params: Promise<Params> }) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;
  const copy = departmentCopy(department);

  const counts = await Promise.all(
    DEPARTMENTS.map(async (d) => {
      const [series, categories] = await Promise.all([getPublishedSeries(d), getCategories(d)]);
      return { series: series?.length ?? 0, categories: categories.length };
    })
  );
  const stats = [
    { value: DEPARTMENTS.length, label: "Departments" },
    { value: counts.reduce((sum, c) => sum + c.series, 0), label: "Series & collections" },
    { value: counts.reduce((sum, c) => sum + c.categories, 0), label: "Categories" },
    { value: FOUNDERS.length, label: "Co-founders" },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--foreground),transparent_94%),transparent_60%)]"
        />
        <Container className="relative flex flex-col gap-6 py-20 md:py-28">
          <Reveal>
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              About Flow
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="max-w-3xl font-heading text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Design is a decision, repeated.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Flow started as a disagreement about how a bathroom should feel — and turned into{" "}
              {copy.label.toLowerCase()} and door hardware built to the same standard.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <dl className="mt-4 flex max-w-2xl flex-wrap gap-x-10 gap-y-6 border-t border-border pt-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-heading text-3xl font-black text-foreground">{stat.value}</dd>
                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </dl>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <Reveal className="max-w-2xl">
            <span className="font-heading text-sm font-black text-muted-foreground/40">01</span>
            <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl">
              Three people, one obsession
            </h2>
            <p className="mt-3 text-muted-foreground">
              No investors to please, no committee to satisfy — just three co-founders who
              couldn&apos;t find hardware they&apos;d want in their own homes.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {FOUNDERS.map((founder, i) => (
              <Reveal
                key={founder.name}
                delay={i * 0.08}
                className="group flex flex-col gap-5"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] bg-foreground">
                  {founder.photo ? (
                    <Image
                      src={founder.photo}
                      alt={founder.name}
                      fill
                      sizes="(min-width: 640px) 33vw, 90vw"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <>
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_oklch,white,transparent_82%),transparent_60%)] transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-heading text-6xl font-black text-background transition-transform duration-700 ease-out group-hover:scale-110 sm:text-7xl">
                        {founder.initials}
                      </span>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-foreground">{founder.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {founder.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{founder.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-16 md:py-24">
        <Container>
          <div className="flex flex-col divide-y divide-border">
            {MANIFESTO.map((block, i) => (
              <Reveal
                key={block.index}
                delay={i * 0.06}
                className="grid grid-cols-1 gap-4 py-10 first:pt-0 last:pb-0 md:grid-cols-[auto_1fr] md:gap-10"
              >
                <span className="font-heading text-sm font-black text-muted-foreground/40">
                  {block.index}
                </span>
                <div className="max-w-2xl">
                  <h3 className="font-heading text-2xl text-foreground sm:text-3xl">
                    {block.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground">{block.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-16 md:py-24">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Reveal>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">
              See the design language for yourself.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-wrap gap-4">
            <Link
              href={seriesIndexHref(department)}
              className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Browse {copy.seriesLabel.toLowerCase()}
            </Link>
            <Link
              href={departmentHref(department)}
              className="rounded-full border border-border px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Back to shop
            </Link>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
