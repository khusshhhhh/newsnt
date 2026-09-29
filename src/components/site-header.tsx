import Link from "next/link";
import { Search } from "lucide-react";
import { getActiveFinishes, getCategories, getPublishedSeries } from "@/lib/data/catalog";
import { departmentCopy, departmentHref, otherDepartment, searchHref, type Department } from "@/lib/department";
import { Container } from "@/components/container";
import { CatalogNav } from "@/components/catalog-nav";
import { MobileNav } from "@/components/mobile-nav";
import { QuoteBasketButton } from "@/components/quote-basket-button";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function SiteHeader({ department }: { department: Department }) {
  const [series, categories, finishes] = await Promise.all([
    getPublishedSeries(department),
    getCategories(department),
    getActiveFinishes(),
  ]);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <Link href={departmentHref(department)} className="text-foreground">
          <Logo />
        </Link>

        <nav className="hidden justify-self-center md:block">
          <CatalogNav
            department={department}
            series={series ?? []}
            categories={categories ?? []}
            finishes={finishes}
          />
        </nav>

        <div className="col-start-3 flex items-center justify-self-end gap-3">
          <Link
            href={searchHref(department)}
            aria-label="Search"
            title="Search (/)"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Search className="size-4" />
          </Link>

          <QuoteBasketButton department={department} />

          <DepartmentSwitcher current={department} />

          <MobileNav
            department={department}
            series={series ?? []}
            categories={categories ?? []}
            finishes={finishes}
          />
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
