"use client";

import Image from "next/image";
import Link from "next/link";
import { clearRecentlyViewed, useRecentlyViewed } from "@/lib/recently-viewed";
import { productImageUrl } from "@/lib/supabase/storage";
import { productHref, type Department } from "@/lib/department";
import { cn } from "@/lib/utils";
import { Container } from "@/components/container";

/**
 * "Pick up where you left off": the visitor's own recently viewed products in
 * this department, from their browser's storage. Renders nothing until there
 * is something to show, so first-time visitors never see an empty section.
 */
export function RecentlyViewed({
  department,
  excludeProductId,
  contained = false,
  className,
}: {
  department: Department;
  /** Leave out the product whose page this is on. */
  excludeProductId?: string;
  /** Wrap the contents in a Container, for a full-bleed section (bordered edge to edge) on pages that aren't already inside one. */
  contained?: boolean;
  className?: string;
}) {
  const items = useRecentlyViewed(department, excludeProductId).slice(0, 8);
  if (items.length === 0) return null;

  const content = (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="recently-viewed-heading" className="font-heading text-2xl text-foreground">
          Recently viewed
        </h2>
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Clear
        </button>
      </div>
      <ul className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0">
        {items.map((item) => (
          <li key={item.productId} className="w-40 shrink-0 snap-start sm:w-48">
            <Link href={productHref(item)} className="group flex flex-col gap-2">
              <span className="relative block aspect-square overflow-hidden rounded-xl border border-border/60 bg-card">
                {item.imagePath ? (
                  <Image
                    src={productImageUrl(item.imagePath)}
                    alt=""
                    fill
                    sizes="192px"
                    className="object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</span>
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                {item.seriesName && (
                  <span className="truncate text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    {item.seriesName}
                  </span>
                )}
                <span className="line-clamp-2 font-heading text-sm text-foreground group-hover:underline group-hover:underline-offset-4">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground">{item.priceLabel}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <section aria-labelledby="recently-viewed-heading" className={cn("animate-fade-in", className)}>
      {contained ? <Container>{content}</Container> : content}
    </section>
  );
}
