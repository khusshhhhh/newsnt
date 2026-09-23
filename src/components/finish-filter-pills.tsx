import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Finish } from "@/lib/supabase/types";

/** Pill row for cross-filtering a product listing by finish — plain links, no JS required. */
export function FinishFilterPills({
  finishes,
  basePath,
  activeCode,
}: {
  finishes: Finish[];
  basePath: string;
  activeCode?: string;
}) {
  if (finishes.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2">
      <Link
        href={basePath}
        className={cn(
          "rounded-full border px-4 py-1.5 text-sm transition-colors",
          !activeCode
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
        )}
      >
        All finishes
      </Link>
      {finishes.map((finish) => {
        const active = finish.code === activeCode;
        return (
          <Link
            key={finish.id}
            href={`${basePath}?finish=${finish.code}`}
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
          </Link>
        );
      })}
    </div>
  );
}
