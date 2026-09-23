"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/supabase/storage";
import { seriesHref } from "@/lib/department";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { FALLBACK_HERO } from "@/lib/fallback-hero";
import type { Series } from "@/lib/supabase/types";

/**
 * An index-and-preview layout instead of a row of cards: the list carries the
 * names, the panel carries one large image that cross-fades to whichever row
 * is active. Hover/focus drives the preview on pointer devices; every row is
 * still a plain link so touch and keyboard users get the same destination
 * without depending on hover state.
 */
export function SeriesShowcase({ series }: { series: Series[] }) {
  const [active, setActive] = useState(0);
  const current = series[Math.min(active, series.length - 1)];
  const image = current.hero_image_url
    ? mediaUrl(current.hero_image_url)
    : FALLBACK_HERO[current.department];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-10">
      <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-3xl bg-card lg:order-2 lg:aspect-auto lg:min-h-[520px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {image ? (
              <Image
                src={image}
                alt={current.name}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                priority={active === 0}
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--foreground),transparent_95%),transparent_60%)]"
              />
            )}

            <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
              <span className="self-end font-heading text-sm font-bold text-white/70">
                {String(active + 1).padStart(2, "0")} / {String(series.length).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {current.name}
                </h3>
                {current.design_story && (
                  <p className="mt-2 max-w-sm text-sm text-white/80">{current.design_story}</p>
                )}
                <Link
                  href={seriesHref(current)}
                  className="group mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white"
                >
                  Explore
                  <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="order-2 flex flex-col lg:order-1 lg:justify-center">
        {series.map((s, i) => (
          <Link
            key={s.id}
            href={seriesHref(s)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className={cn(
              "group flex items-center gap-4 border-b border-border py-5 first:border-t sm:py-6",
              i === active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "font-heading text-sm font-bold transition-colors",
                i === active ? "text-foreground/50" : "text-muted-foreground/40"
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 font-heading text-2xl font-black tracking-tight transition-colors group-hover:text-foreground sm:text-3xl md:text-4xl">
              {s.name}
            </span>
            <ArrowUpRight
              className={cn(
                "size-5 shrink-0 transition-all duration-300",
                i === active
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
              )}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
