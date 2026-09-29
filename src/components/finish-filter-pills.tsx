import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Finish } from "@/lib/supabase/types";

/** Pill row for cross-filtering a product listing by finish — plain links, no JS required. */
export function FinishFilterPills({
  finishes,
  basePath,
  activeCode,
  hrefFor,
  counts,
}: {
  finishes: Finish[];
  basePath: string;
  activeCode?: string;
  /** Builds each pill's link, so other listing params (sort, stock) survive a finish change. */
  hrefFor?: (finishCode: string | undefined) => string;
  /**
   * Products per finish in this listing (lower-cased colour name → count, from
   * getFinishCounts). When given, finishes nothing here comes in are left out
   * rather than leading to an empty page, and each pill shows its count.
   */
  counts?: Record<string, number>;
}) {
  const href = hrefFor ?? ((code?: string) => (code ? `${basePath}?finish=${code}` : basePath));
  const countOf = (finish: Finish) => counts?.[finish.name.trim().toLowerCase()] ?? 0;
  const visible = counts ? finishes.filter((f) => f.code === activeCode || countOf(f) > 0) : finishes;
  if (visible.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2">
      <Link
        href={href(undefined)}
        aria-current={!activeCode ? "true" : undefined}
        className={cn(
          "rounded-full border px-4 py-1.5 text-sm transition-colors",
          !activeCode
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
        )}
      >
        All finishes
      </Link>
      {visible.map((finish) => {
        const active = finish.code === activeCode;
        return (
          <Link
            key={finish.id}
            href={href(finish.code)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2.5 rounded-full ring-1 ring-offset-1",
                active ? "ring-background/40 ring-offset-foreground" : "ring-border ring-offset-background"
              )}
              style={{ background: finish.hex }}
            />
            {finish.name}
            {counts && (
              <span className={cn("tabular-nums", active ? "text-background/60" : "text-muted-foreground/70")}>
                {countOf(finish)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
