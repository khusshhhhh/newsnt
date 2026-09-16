"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/supabase/storage";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import {
  departmentCopy,
  seriesCategoryHref,
  seriesHref,
  seriesIndexHref,
  categoryHref,
  type Department,
} from "@/lib/department";
import type { Category, Series } from "@/lib/supabase/types";

export function MegaMenu({
  department,
  series,
  categories,
}: {
  department: Department;
  series: Series[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const copy = departmentCopy(department);
  const featured = series.find((s) => s.hero_image_url) ?? series[0];

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Shop
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-0 top-16 z-40 border-b border-border bg-popover shadow-lg"
          >
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,300px)] gap-10 px-6 py-10 sm:px-8 lg:px-12">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {copy.seriesLabel}
                </p>
                <ul className="flex flex-col gap-1">
                  {series.map((s, i) => (
                    <li key={s.id}>
                      <Link
                        href={seriesHref(s)}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-2.5 rounded-md py-1.5 text-foreground/85 transition-colors hover:text-foreground"
                      >
                        <span className="font-heading text-xs text-muted-foreground/50">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                          {s.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {series.length === 0 && (
                    <li className="text-muted-foreground">Coming soon</li>
                  )}
                </ul>
                <Link
                  href={seriesIndexHref(department)}
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  View all {copy.seriesLabel.toLowerCase()}
                </Link>
              </div>

              <div className="border-x border-border/60 px-10">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Shop by category
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={categoryHref(c)}
                      onClick={() => setOpen(false)}
                      className="text-foreground/85 transition-colors hover:text-foreground"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {categories.length === 0 && (
                    <p className="col-span-2 text-muted-foreground">Coming soon</p>
                  )}
                </div>

                {series.length > 0 && categories.length > 0 && (
                  <>
                    <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Popular combinations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {series.slice(0, 3).flatMap((s) =>
                        categories.slice(0, 2).map((c) => (
                          <Link
                            key={`${s.id}-${c.id}`}
                            href={seriesCategoryHref(s, c)}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                          >
                            {c.name} · {s.name}
                          </Link>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {featured && (
                <Link
                  href={seriesHref(featured)}
                  onClick={() => setOpen(false)}
                  className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl border border-border/60 bg-foreground"
                >
                  {featured.hero_image_url ? (
                    <Image
                      src={mediaUrl(featured.hero_image_url)}
                      alt={featured.name}
                      fill
                      sizes="300px"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      className="object-cover opacity-90 transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="relative z-10 p-5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                      Featured {copy.seriesLabel.toLowerCase().replace(/s$/, "")}
                    </span>
                    <h3 className="mt-1 font-heading text-xl font-black tracking-tight text-white">
                      {featured.name}
                    </h3>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white">
                      Explore
                      <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
