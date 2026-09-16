"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/supabase/storage";
import { seriesHref, type Department } from "@/lib/department";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { Series } from "@/lib/supabase/types";

// Static fallback for departments with no admin-uploaded hero yet —
// AI-generated mood photography matching the site's monochrome aesthetic.
const FALLBACK_HERO: Partial<Record<Department, string>> = {
  "door-hardware": "/images/door-hardware-hero.png",
};

/**
 * A horizontally-scrolling row rather than a fixed-column grid: with one
 * series it's just one card (no empty grid cells to the side), and with six
 * it scrolls instead of wrapping into an uneven last row. Vertical mouse
 * wheel input is redirected to horizontal scroll since trackpad-only
 * gestures aren't available to everyone.
 */
export function SeriesCarousel({ series }: { series: Series[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      // Only take over the scroll while there's somewhere left to go in
      // that direction — otherwise release it back to the page instead of
      // trapping the user the moment they reach either end.
      const canScrollRight = el!.scrollLeft < el!.scrollWidth - el!.clientWidth - 1;
      const canScrollLeft = el!.scrollLeft > 0;
      if ((e.deltaY > 0 && !canScrollRight) || (e.deltaY < 0 && !canScrollLeft)) return;

      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
    >
      {series.map((s, i) => (
        <SeriesCard key={s.id} series={s} index={i + 1} />
      ))}
    </div>
  );
}

function SeriesCard({ series, index }: { series: Series; index: number }) {
  const image = series.hero_image_url
    ? mediaUrl(series.hero_image_url)
    : FALLBACK_HERO[series.department];

  return (
    <Link
      href={seriesHref(series)}
      className="group relative flex aspect-[3/4] w-[78vw] max-w-[360px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl border border-border/60 bg-card sm:w-[340px]"
    >
      {image ? (
        <Image
          src={image}
          alt={series.name}
          fill
          sizes="(min-width: 640px) 340px, 78vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--foreground),transparent_95%),transparent_60%)]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

      <span className="absolute right-5 top-5 font-heading text-sm font-bold text-white/70">
        {String(index).padStart(2, "0")}
      </span>

      <div className="relative z-10 p-6">
        <h3 className="font-heading text-2xl font-black tracking-tight text-white">
          {series.name}
        </h3>
        {series.design_story && (
          <p className="mt-2 line-clamp-2 text-sm text-white/75">{series.design_story}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white">
          Explore
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
