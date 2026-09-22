import { Container } from "@/components/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ProductCard's aspect-square image + label lines so grids don't jump when data arrives. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

/** Mirrors the `grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4` product grids used across catalog pages. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors SeriesCard's aspect-[3/4] hero tile. */
export function SeriesCardSkeleton() {
  return (
    <div className="relative flex aspect-[3/4] w-[78vw] max-w-[360px] shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-border/60 bg-card sm:w-[340px]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative z-10 p-6">
        <Skeleton className="h-6 w-2/3 bg-background/20" />
        <Skeleton className="mt-3 h-3 w-4/5 bg-background/20" />
      </div>
    </div>
  );
}

/** Mirrors SeriesCarousel's horizontal-scrolling row. */
export function SeriesCarouselSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="no-scrollbar -mx-6 flex gap-5 overflow-x-hidden px-6 pb-2 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
      {Array.from({ length: count }).map((_, i) => (
        <SeriesCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors DepartmentHomePage's hero + series row + featured grid, so the whole route fades in as one shape. */
export function DepartmentHomeSkeleton() {
  return (
    <div>
      <section className="border-b border-border bg-background">
        <Container className="flex flex-col gap-6 py-24 md:py-36">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full max-w-2xl sm:h-20 md:h-24" />
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="mt-2 h-11 w-48 rounded-full" />
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <div className="mb-8 flex items-end justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <SeriesCarouselSkeleton />
        </Container>
      </section>

      <section className="border-t border-border py-16 md:py-24">
        <Container>
          <Skeleton className="mb-8 h-8 w-32" />
          <ProductGridSkeleton />
        </Container>
      </section>
    </div>
  );
}

/** Mirrors a catalog listing page: a title block over a product grid. */
export function CatalogPageSkeleton({ withSubtitle = true }: { withSubtitle?: boolean }) {
  return (
    <Container className="py-12">
      <div className="mb-8">
        <Skeleton className="h-9 w-56" />
        {withSubtitle && <Skeleton className="mt-3 h-4 w-40" />}
      </div>
      <ProductGridSkeleton />
    </Container>
  );
}

/** Mirrors a page with a breadcrumb row above the title, e.g. series/category and product pages. */
export function BreadcrumbCatalogSkeleton() {
  return (
    <Container className="py-12">
      <div className="mb-8 flex gap-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mb-8 h-9 w-72" />
      <ProductGridSkeleton />
    </Container>
  );
}

/** Mirrors SeriesIndexPage: heading + intro copy over the series carousel. */
export function SeriesIndexSkeleton() {
  return (
    <Container className="py-16">
      <div className="mb-12 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      <SeriesCarouselSkeleton />
    </Container>
  );
}

/** Mirrors SearchPage's underline search field sitting above the results grid. */
export function SearchPageSkeleton() {
  return (
    <Container className="py-12">
      <div className="mb-10 max-w-xl">
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="mb-8 h-4 w-48" />
      <ProductGridSkeleton />
    </Container>
  );
}

/** Mirrors SeriesDetailPage's full-bleed hero band + category pills + product grid. */
export function SeriesDetailSkeleton() {
  return (
    <div>
      <div className="relative h-[45vh] min-h-80 overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-x-0 bottom-0 w-full py-10">
          <Container>
            <Skeleton className="h-12 w-72 sm:h-14 md:h-16" />
          </Container>
        </div>
      </div>
      <Container className="py-12">
        <div className="mb-10 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <ProductGridSkeleton />
      </Container>
    </div>
  );
}

/** Mirrors ProductPage's breadcrumb + gallery/details two-column layout. */
export function ProductDetailSkeleton() {
  return (
    <Container className="py-12">
      <div className="mb-8 flex gap-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-16 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>

        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-11 w-3/4" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />

          <div className="mt-8 rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="mt-5 h-12 w-full rounded-full" />
          </div>

          <div className="mt-10 border-t border-border pt-8">
            <Skeleton className="mb-5 h-5 w-32" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

/** Mirrors an admin list page: title + department tabs over a divided row list. */
export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-md" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the admin dashboard's stat cards + recent products list. */
export function AdminDashboardSkeleton() {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="mt-10">
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="divide-y divide-border rounded-xl border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="size-12 shrink-0 rounded-md" />
              <div className="flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mirrors an admin new/edit form page: title over a single-column field stack. */
export function AdminFormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <div className="mt-8 flex max-w-2xl flex-col gap-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}

/** Mirrors the product edit page: title + tab strip over the active panel's field stack. */
export function AdminProductFormSkeleton() {
  return (
    <div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-6 flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-6 flex max-w-2xl flex-col gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}

/** Mirrors a Kanban board page (pipeline/orders): title + N stage columns of cards. */
export function AdminKanbanSkeleton({ columns = 5, cardsPerColumn = 3 }: { columns?: number; cardsPerColumn?: number }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <div className="mt-6 flex gap-3 overflow-hidden">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex min-h-[120px] w-[82vw] shrink-0 flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2 sm:w-72 lg:w-auto lg:flex-1">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: cardsPerColumn }).map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the customer detail page: header + a 2-column grid of cards. */
export function AdminCustomerDetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-24" />
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 flex flex-col gap-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the two-panel gateway (very first) home page while hero images resolve. */
export function GatewaySkeleton() {
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="relative flex min-h-[60vh] flex-1 flex-col justify-end overflow-hidden bg-card sm:min-h-screen">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="relative z-10 p-8 pb-16 sm:p-12 sm:pb-20">
            <Skeleton className="h-3 w-6 bg-foreground/10" />
            <Skeleton className="mt-3 h-12 w-48 bg-foreground/10 sm:h-14 md:h-16" />
            <Skeleton className="mt-3 h-4 w-40 bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
