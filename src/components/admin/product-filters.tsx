"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** Native `<select>` filters that push a query-param update, preserving every other filter already in the URL. */
export function ProductFilters({
  seriesOptions,
  categoryOptions,
  finishOptions,
}: {
  seriesOptions: Option[];
  categoryOptions: Option[];
  finishOptions: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {seriesOptions.length > 0 && (
        <select
          aria-label="Filter by series"
          className={selectClass}
          value={searchParams.get("series") ?? ""}
          onChange={(e) => setParam("series", e.target.value)}
        >
          <option value="">All series</option>
          {seriesOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {categoryOptions.length > 0 && (
        <select
          aria-label="Filter by category"
          className={selectClass}
          value={searchParams.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="Filter by finish"
        className={selectClass}
        value={searchParams.get("finish") ?? ""}
        onChange={(e) => setParam("finish", e.target.value)}
      >
        <option value="">All finishes</option>
        {finishOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by stock status"
        className={selectClass}
        value={searchParams.get("stock") ?? ""}
        onChange={(e) => setParam("stock", e.target.value)}
      >
        <option value="">All stock statuses</option>
        <option value="in_stock">In stock</option>
        <option value="made_to_order">Made to order</option>
        <option value="out_of_stock">Out of stock</option>
        <option value="discontinued">Discontinued</option>
      </select>
    </div>
  );
}
