import Link from "next/link";
import { getCategories } from "@/lib/data/catalog";

export async function SiteHeader() {
  const categories = await getCategories();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-xl tracking-wide text-foreground"
        >
          AAKAR
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link
            href="/series"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Series
          </Link>
          {categories?.slice(0, 4).map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <Link
          href="/series"
          className="rounded-full border border-primary/40 px-4 py-1.5 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Explore
        </Link>
      </div>
    </header>
  );
}
