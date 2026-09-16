"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
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
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,220px)_1fr] gap-10 px-6 py-10 sm:px-8 lg:px-12">
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {copy.seriesLabel}
                </p>
                <ul className="flex flex-col gap-2">
                  {series.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={seriesHref(s)}
                        onClick={() => setOpen(false)}
                        className="text-foreground/85 transition-colors hover:text-foreground"
                      >
                        {s.name}
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

              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Shop by category
                </p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
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
                    <p className="text-muted-foreground">Coming soon</p>
                  )}
                </div>

                {series.length > 0 && categories.length > 0 && (
                  <>
                    <p className="mt-8 mb-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
