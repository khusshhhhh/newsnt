"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LISTING_SORTS, type ListingSort } from "@/lib/listing";

/** Sort + "in stock only" for product listings. Updates the URL (so results are shareable) and returns to page 1. */
export function ListingControls({
  sort,
  inStockOnly,
  total,
}: {
  sort: ListingSort;
  inStockOnly: boolean;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: "sort" | "stock", value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="flex items-center gap-2 text-muted-foreground" aria-live="polite">
        {total} product{total === 1 ? "" : "s"}
        {pending && <Loader2 className="size-3.5 animate-spin" aria-label="Updating" />}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => update("stock", e.target.checked ? "in" : null)}
            className="size-4 rounded border-input accent-foreground"
          />
          In stock only
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value === "featured" ? null : e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {(Object.keys(LISTING_SORTS) as ListingSort[]).map((s) => (
              <option key={s} value={s}>
                {LISTING_SORTS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
