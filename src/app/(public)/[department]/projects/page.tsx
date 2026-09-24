import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getApprovedProjectPhotos, getPublishedSeries } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { ProjectPhotoSubmitDialog } from "@/components/project-photo-submit-dialog";
import { departmentCopy, isDepartment, type Department } from "@/lib/department";

type Params = { department: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return { title: `Projects — ${departmentCopy(department).label}` };
}

export default async function ProjectsPage({ params }: { params: Promise<Params> }) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const [photos, series] = await Promise.all([
    getApprovedProjectPhotos(department),
    getPublishedSeries(department),
  ]);

  return (
    <Container className="py-16 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {departmentCopy(department).label}
          </span>
          <h1 className="mt-3 font-heading text-4xl text-foreground">Real projects</h1>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Installations from real customers — submit your own and we&apos;ll add it once reviewed.
          </p>
        </Reveal>
        <ProjectPhotoSubmitDialog department={department} series={series ?? []} />
      </div>

      {photos.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">
          No project photos yet — be the first to share one.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, i) => (
            <Reveal key={photo.id} delay={Math.min(i, 6) * 0.05}>
              <figure className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={mediaUrl(photo.storage_path)}
                    alt={photo.caption ?? ""}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    placeholder="blur"
                    blurDataURL={photo.blur_data_url || BLUR_DATA_URL}
                    className="object-cover"
                  />
                </div>
                {(photo.caption || photo.series) && (
                  <figcaption className="p-4 text-sm text-muted-foreground">
                    {photo.caption}
                    {photo.series && (
                      <span className="mt-1 block text-xs uppercase tracking-wide">
                        {photo.series.name}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </Container>
  );
}
