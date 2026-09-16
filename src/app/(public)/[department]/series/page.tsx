import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedSeries } from "@/lib/data/catalog";
import { SeriesCarousel } from "@/components/series-carousel";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { departmentCopy, isDepartment, type Department } from "@/lib/department";

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

      {series && series.length > 0 ? (
        <SeriesCarousel series={series} />
      ) : (
        <p className="text-muted-foreground">
          No {copy.seriesLabel.toLowerCase()} published yet — add one from the admin panel.
        </p>
      )}
    </Container>
  );
}
