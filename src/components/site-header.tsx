import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { getCategories, getProductCategoryIds, getPublishedSeries } from "@/lib/data/catalog";
import {
  departmentCopy,
  departmentHref,
  otherDepartment,
  projectsHref,
  searchHref,
  seriesHref,
  categoryHref,
  type Department,
} from "@/lib/department";
import { Container } from "@/components/container";
import { MegaMenu } from "@/components/mega-menu";
import { QuoteBasketButton } from "@/components/quote-basket-button";
import { Logo } from "@/components/logo";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function SiteHeader({ department }: { department: Department }) {
  const [series, categories] = await Promise.all([
    getPublishedSeries(department),
    getCategories(department),
  ]);
  const other = otherDepartment(department);

  // Category ids present in each series' products, so the mega-menu can
  // nest "Shop by category" under the series it actually belongs to
  // instead of one flat list.
  const categoryIdsBySeries = Object.fromEntries(
    await Promise.all(
      (series ?? []).map(async (s) => [s.id, await getProductCategoryIds(department, { seriesSlug: s.slug })] as const)
    )
  );

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={departmentHref(department)} className="text-foreground">
            <Logo />
          </Link>
          <nav className="hidden md:block">
            <MegaMenu
              department={department}
              series={series ?? []}
              categories={categories ?? []}
              categoryIdsBySeries={categoryIdsBySeries}
            />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={searchHref(department)}
            aria-label="Search"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Search className="size-4" />
          </Link>

          <QuoteBasketButton department={department} />

          <DepartmentSwitcher current={department} />

          <Dialog>
            <DialogTrigger
              className={buttonVariants({ variant: "outline", size: "icon", className: "md:hidden" })}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs">
              <DialogTitle className="font-heading text-lg">Menu</DialogTitle>
              <nav className="flex flex-col gap-1 text-sm">
                <DialogClose
                  render={<Link href={searchHref(department)} />}
                  nativeButton={false}
                  className="mb-2 flex items-center gap-2 rounded-md px-1 py-2 text-foreground hover:bg-accent"
                >
                  <Search className="size-4" /> Search
                </DialogClose>
                <p className="mt-2 px-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {departmentCopy(department).seriesLabel}
                </p>
                {series?.map((s) => (
                  <DialogClose
                    key={s.id}
                    render={<Link href={seriesHref(s)} />}
                    nativeButton={false}
                    className="rounded-md px-1 py-2 text-foreground hover:bg-accent"
                  >
                    {s.name}
                  </DialogClose>
                ))}
                <p className="mt-3 px-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Categories
                </p>
                {categories?.map((c) => (
                  <DialogClose
                    key={c.id}
                    render={<Link href={categoryHref(c)} />}
                    nativeButton={false}
                    className="rounded-md px-1 py-2 text-foreground hover:bg-accent"
                  >
                    {c.name}
                  </DialogClose>
                ))}
                <div className="mt-4 border-t border-border pt-4">
                  <DialogClose
                    render={<Link href={projectsHref(department)} />}
                    nativeButton={false}
                    className="rounded-md px-1 py-2 text-foreground hover:bg-accent"
                  >
                    Projects
                  </DialogClose>
                  <DialogClose
                    render={<Link href={departmentHref(other)} />}
                    nativeButton={false}
                    className="rounded-md px-1 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Switch to {departmentCopy(other).label} →
                  </DialogClose>
                </div>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </Container>
    </header>
  );
}

function DepartmentSwitcher({ current }: { current: Department }) {
  const other = otherDepartment(current);
  return (
    <div className="hidden items-center rounded-full border border-border p-0.5 text-xs sm:flex">
      <Link
        href={departmentHref(current)}
        className="rounded-full bg-foreground px-3 py-1.5 text-background"
      >
        {departmentCopy(current).shortLabel}
      </Link>
      <Link
        href={departmentHref(other)}
        className={cn(
          "rounded-full px-3 py-1.5 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
        )}
      >
        {departmentCopy(other).shortLabel}
      </Link>
    </div>
  );
}
