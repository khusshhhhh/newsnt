"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/supabase/storage";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { FALLBACK_HERO } from "@/lib/fallback-hero";
import { categoryHref, departmentCopy, finishHref, seriesHref, seriesIndexHref, type Department } from "@/lib/department";
import type { CategoryWithImages, Finish, Series } from "@/lib/supabase/types";

type NavItem = {
  id: string;
  name: string;
  href: string;
  image?: string | null;
  swatch?: string | null;
  description?: string | null;
};

type TabKey = "series" | "categories" | "finishes";

export function CatalogNav({
  department,
  series,
  categories,
  finishes,
}: {
  department: Department;
  series: Series[];
  categories: CategoryWithImages[];
  finishes: Finish[];
}) {
  const [openTab, setOpenTab] = useState<TabKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const copy = departmentCopy(department);

  useEffect(() => {
    if (!openTab) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenTab(null);
    }
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenTab(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [openTab]);

  const seriesItems: NavItem[] = series.map((s) => ({
    id: s.id,
    name: s.name,
    href: seriesHref(s),
    image: s.hero_image_url ? mediaUrl(s.hero_image_url) : (FALLBACK_HERO[department] ?? null),
    description: s.design_story,
  }));

  const categoryItems: NavItem[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    href: categoryHref(c),
    image: c.images[0] ? mediaUrl(c.images[0].storage_path) : null,
    description: null,
  }));

  const finishItems: NavItem[] = finishes.map((f) => ({
    id: f.id,
    name: f.name,
    href: finishHref(department, f.code),
    swatch: f.hex,
    description: `Finish code ${f.code}`,
  }));

  const tabs: { key: TabKey; label: string; items: NavItem[]; viewAllHref?: string }[] = [
    { key: "series", label: copy.seriesLabel, items: seriesItems, viewAllHref: seriesIndexHref(department) },
    { key: "categories", label: "Categories", items: categoryItems },
    { key: "finishes", label: "Finishes", items: finishItems },
  ];

  const active = tabs.find((t) => t.key === openTab) ?? null;

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setOpenTab((v) => (v === tab.key ? null : tab.key))}
          aria-expanded={openTab === tab.key}
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
            openTab === tab.key
              ? "border-foreground/30 text-foreground"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
        >
          {tab.label}
          <ChevronDown className={cn("size-3 transition-transform", openTab === tab.key && "rotate-180")} />
        </button>
      ))}

      {active && (
          <div
            key={active.key}
            className="fixed inset-x-0 top-16 z-40 border-b border-border bg-popover animate-in fade-in-0 slide-in-from-top-1.5 duration-200 ease-out motion-reduce:animate-none"
          >
            <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-8 lg:px-12">
              {active.viewAllHref && active.items.length > 0 && (
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {active.label}
                  </p>
                  <Link
                    href={active.viewAllHref}
                    onClick={() => setOpenTab(null)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    View all
                  </Link>
                </div>
              )}
              <NavPreviewList
                items={active.items}
                emptyLabel="Coming soon"
                onNavigate={() => setOpenTab(null)}
              />
            </div>
          </div>
      )}
    </div>
  );
}

function NavPreviewList({
  items,
  emptyLabel,
  onNavigate,
}: {
  items: NavItem[];
  emptyLabel: string;
  onNavigate: () => void;
}) {
  const [active, setActive] = useState(0);

  if (items.length === 0) {
    return <p className="text-muted-foreground">{emptyLabel}</p>;
  }

  const current = items[Math.min(active, items.length - 1)];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <ul className="grid max-h-[55vh] grid-cols-1 gap-x-8 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.id} className="border-b border-border/60">
            <Link
              href={item.href}
              onClick={onNavigate}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={cn(
                "group flex items-center justify-between gap-3 py-3.5 transition-colors",
                i === active ? "text-foreground" : "text-foreground/70 hover:text-foreground"
              )}
            >
              <span className="text-sm font-medium">{item.name}</span>
              <ArrowUpRight
                className={cn(
                  "size-3.5 shrink-0 transition-opacity",
                  i === active ? "opacity-60" : "opacity-0 group-hover:opacity-40"
                )}
              />
            </Link>
          </li>
        ))}
      </ul>

      <div className="relative hidden overflow-hidden rounded-2xl border border-border/60 bg-card lg:block">
        <div className="relative aspect-[4/5]">
          {current.image ? (
            <>
              <Image
                src={current.image}
                alt={current.name}
                fill
                sizes="320px"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            </>
          ) : current.swatch ? (
            <div aria-hidden className="absolute inset-0" style={{ background: current.swatch }} />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--foreground),transparent_95%),transparent_60%)]"
            />
          )}
          {current.swatch && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />}

          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="font-heading text-xl font-black tracking-tight text-white">{current.name}</p>
            {current.description && (
              <p className="mt-1.5 line-clamp-2 text-xs text-white/80">{current.description}</p>
            )}
            <Link
              href={current.href}
              onClick={onNavigate}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white"
            >
              Explore
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
