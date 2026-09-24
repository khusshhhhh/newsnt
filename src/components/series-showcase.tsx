"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/supabase/storage";
import { seriesHref } from "@/lib/department";
import { blurFor } from "@/lib/blur-placeholder";
import { FALLBACK_HERO } from "@/lib/fallback-hero";
import type { Series } from "@/lib/supabase/types";

function seriesImage(s: Series) {
  return s.hero_image_url ? mediaUrl(s.hero_image_url) : FALLBACK_HERO[s.department];
}

function seriesBlur(s: Series) {
  const image = seriesImage(s);
  return image ? blurFor(image, s.hero_blur_data_url) : undefined;
}

/**
 * Two layouts for two kinds of device, picked in CSS so there's no
 * hydration flash or layout shift:
 * - Large screens with a mouse get the index-and-preview showcase, where
 *   hovering a name cross-fades the big image.
 * - Phones and tablets (anything that can't hover — including a landscape
 *   iPad) get a swipeable card rail where every card carries its own image,
 *   story and a visible Explore button, so nothing depends on hover.
 */
export function SeriesShowcase({ series }: { series: Series[] }) {
  return (
    <>
      <div className="lg:can-hover:hidden">
        <SeriesTouchRail series={series} />
      </div>
      <div className="hidden lg:can-hover:block">
        <SeriesHoverShowcase series={series} />
      </div>
    </>
  );
}

/**
 * An index-and-preview layout instead of a row of cards: the list carries the
 * names, the panel carries one large image that cross-fades to whichever row
 * is active. Hover/focus drives the preview; every row is still a plain link
 * so keyboard users reach the same destination.
 */
function SeriesHoverShowcase({ series }: { series: Series[] }) {
  const [active, setActive] = useState(0);
  const current = series[Math.min(active, series.length - 1)];
  const image = seriesImage(current);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-stretch gap-10">
      <div className="relative order-2 min-h-[520px] overflow-hidden rounded-3xl bg-card">
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
                sizes="55vw"
                placeholder="blur"
                blurDataURL={seriesBlur(current)}
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--foreground),transparent_95%),transparent_60%)]"
              />
            )}

            <div className="relative z-10 flex h-full flex-col justify-between p-8">
              <span className="self-end font-heading text-sm font-bold text-white/70">
                {String(active + 1).padStart(2, "0")} / {String(series.length).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-heading text-4xl font-black tracking-tight text-white">{current.name}</h3>
                {current.design_story && <p className="mt-2 max-w-sm text-sm text-white/80">{current.design_story}</p>}
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

      <div className="order-1 flex flex-col justify-center">
        {series.map((s, i) => (
          <Link
            key={s.id}
            href={seriesHref(s)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className={cn(
              "group flex items-center gap-4 border-b border-border py-6 first:border-t",
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
            <span className="flex-1 font-heading text-4xl font-black tracking-tight transition-colors group-hover:text-foreground">
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

/**
 * Touch layout: a snap-scrolling rail of full cards — one-and-a-bit per view
 * on phones, two-and-a-bit on tablets, so the next card peeks in and signals
 * "swipe". Dots and arrow buttons show and drive the position for anyone who
 * doesn't swipe.
 */
function SeriesTouchRail({ series }: { series: Series[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = rail!;
        const cards = Array.from(el.children) as HTMLElement[];
        const distance = (card: HTMLElement) => Math.abs(card.offsetLeft - cards[0].offsetLeft - el.scrollLeft);
        let closest = 0;
        cards.forEach((card, i) => {
          if (distance(card) < distance(cards[closest])) closest = i;
        });
        // The last cards can never snap to the start, so "scrolled all the
        // way" counts as the last one.
        const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
        setActive(atEnd ? cards.length - 1 : closest);
      });
    }
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      rail.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function goTo(index: number) {
    const rail = railRef.current;
    if (!rail) return;
    const cards = rail.children as HTMLCollectionOf<HTMLElement>;
    const card = cards[Math.max(0, Math.min(series.length - 1, index))];
    if (card) rail.scrollTo({ left: card.offsetLeft - cards[0].offsetLeft, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={railRef}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12"
      >
        {series.map((s, i) => {
          const image = seriesImage(s);
          return (
            <Link
              key={s.id}
              href={seriesHref(s)}
              className="relative flex aspect-[4/5] w-[82%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-3xl bg-card transition-transform active:scale-[0.99] sm:w-[calc(50%-2.5rem)] lg:w-[calc(33.333%-2rem)]"
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw"
                  placeholder="blur"
                  blurDataURL={seriesBlur(s)}
                  className="object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--foreground),transparent_95%),transparent_60%)]"
                />
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

              <span className="absolute left-5 top-5 rounded-full bg-black/35 px-2.5 py-1 font-heading text-xs font-bold text-white/90 backdrop-blur-sm">
                {String(i + 1).padStart(2, "0")} / {String(series.length).padStart(2, "0")}
              </span>

              <div className="relative z-10 p-5 sm:p-6">
                <h3 className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl">{s.name}</h3>
                {s.design_story && <p className="mt-1.5 line-clamp-2 text-sm text-white/80">{s.design_story}</p>}
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black">
                  Explore
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {series.length > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {series.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.name}`}
                aria-current={i === active || undefined}
                onClick={() => goTo(i)}
                className="flex h-6 items-center"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    i === active ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25"
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous series"
              className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-opacity disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === series.length - 1}
              aria-label="Next series"
              className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-opacity disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
