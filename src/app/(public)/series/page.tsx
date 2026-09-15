import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedSeries } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "Series" };

export default async function SeriesIndexPage() {
  const series = await getPublishedSeries();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <h1 className="font-heading text-4xl text-foreground">Series</h1>
        <p className="mt-3 text-muted-foreground">
          Every series carries basin mixers, kitchen mixers, taps and showers
          in a consistent design language, one story per series.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {series?.map((s) => (
          <Link
            key={s.id}
            href={`/series/${s.slug}`}
            className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-xl border border-border/70 bg-muted"
          >
            {s.hero_image_url && (
              <Image
                src={mediaUrl(s.hero_image_url)}
                alt={s.name}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="relative z-10 bg-gradient-to-t from-black/75 via-black/10 to-transparent p-6">
              <h2 className="font-heading text-2xl text-white">{s.name}</h2>
              {s.design_story && (
                <p className="mt-1 max-w-md text-sm text-white/85">
                  {s.design_story}
                </p>
              )}
            </div>
          </Link>
        ))}

        {(!series || series.length === 0) && (
          <p className="text-muted-foreground">
            No series published yet — add one from the admin panel.
          </p>
        )}
      </div>
    </div>
  );
}
