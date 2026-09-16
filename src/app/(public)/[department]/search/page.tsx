import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { searchProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { isDepartment, type Department } from "@/lib/department";

type Params = { department: string };
type SearchParams = { q?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department } = await params;
  if (!isDepartment(department)) return {};
  return { title: "Search" };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const { q = "" } = await searchParams;
  const products = q ? await searchProducts(department, q) : [];

  return (
    <Container className="py-12">
      <form action={`/${department}/search`} className="mb-10 max-w-xl">
        <label htmlFor="q" className="mb-2 block text-sm text-muted-foreground">
          Search products
        </label>
        <div className="flex items-center gap-3 border-b-2 border-foreground pb-2">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            placeholder="Search by name, SKU, or description…"
            className="w-full bg-transparent font-heading text-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
      </form>

      {q ? (
        <>
          <Reveal>
            <p className="mb-8 text-sm text-muted-foreground">
              {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
            </p>
          </Reveal>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nothing matched — try a different name, SKU, or keyword.
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">Start typing to search the catalog.</p>
      )}
    </Container>
  );
}
