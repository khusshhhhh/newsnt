import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedSeries } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { departmentCopy, isDepartment, seriesHref, type Department } from "@/lib/department";

type Params = { department: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return { title: departmentCopy(department).seriesLabel };
}

export default async function SeriesIndexPage({ params }: { params: Promise<Params> }) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;
  const copy = departmentCopy(department);

  const series = await getPublishedSeries(department);

  return (
    <Container className="py-16">
      <Reveal className="mb-12 max-w-2xl">
        <h1 className="font-heading text-4xl text-foreground">{copy.seriesLabel}</h1>
        <p className="mt-3 text-muted-foreground">
          Every {copy.seriesLabel.toLowerCase().replace(/s$/, "")} carries a consistent design
          language across the {copy.label.toLowerCase()} range.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {series?.map((s, i) => (
          <Reveal key={s.id} delay={Math.min(i, 4) * 0.06}>
            <Link
              href={seriesHref(s)}
              className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-xl border border-border bg-muted transition-shadow duration-300 hover:shadow-xl"
            >
              {s.hero_image_url && (
                <Image
                  src={mediaUrl(s.hero_image_url)}
                  alt={s.name}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              )}
              <div className="relative z-10 bg-gradient-to-t from-black/75 via-black/10 to-transparent p-6">
                <h2 className="font-heading text-2xl text-white">{s.name}</h2>
                {s.design_story && (
                  <p className="mt-1 max-w-md text-sm text-white/85">{s.design_story}</p>
                )}
              </div>
            </Link>
          </Reveal>
        ))}

        {(!series || series.length === 0) && (
          <p className="text-muted-foreground">
            No {copy.seriesLabel.toLowerCase()} published yet — add one from the admin panel.
          </p>
        )}
      </div>
    </Container>
  );
}
