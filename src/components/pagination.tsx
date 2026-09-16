import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pager (plain links, no JS required) with a windowed page list. */
export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = getPageList(page, pageCount);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      <PageLink
        href={page > 1 ? buildHref(page - 1) : undefined}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </PageLink>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <PageLink key={p} href={buildHref(p)} active={p === page}>
            {p}
          </PageLink>
        )
      )}

      <PageLink
        href={page < pageCount ? buildHref(page + 1) : undefined}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function getPageList(current: number, total: number): (number | "…")[] {
  const delta = 1;
  const range: (number | "…")[] = [];
  for (let i = 1; i <= total; i++) {
    const isEdge = i === 1 || i === total;
    const isNearCurrent = i >= current - delta && i <= current + delta;
    if (isEdge || isNearCurrent) {
      range.push(i);
    } else if (range[range.length - 1] !== "…") {
      range.push("…");
    }
  }
  return range;
}

function PageLink({
  href,
  active,
  children,
  ...props
}: {
  href?: string;
  active?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"a">, "href">) {
  const className = cn(
    "flex size-9 items-center justify-center rounded-full text-sm transition-colors",
    active && "bg-foreground text-background",
    !active && href && "text-muted-foreground hover:bg-accent hover:text-foreground",
    !href && "pointer-events-none text-muted-foreground/30"
  );

  if (!href) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined} {...props}>
      {children}
    </Link>
  );
}
