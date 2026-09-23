import Link from "next/link";

/** Empty state for a product listing — when filters caused it, offer to clear them instead of a dead end. */
export function EmptyListing({
  filtered,
  resetHref,
  children,
}: {
  filtered: boolean;
  resetHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="text-muted-foreground">{filtered ? "Nothing matches these filters." : children}</p>
      {filtered && (
        <Link href={resetHref} className="mt-3 inline-block text-sm text-foreground underline underline-offset-4">
          Clear filters
        </Link>
      )}
    </div>
  );
}
