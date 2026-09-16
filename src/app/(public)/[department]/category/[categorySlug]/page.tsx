import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug, getProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { departmentHref, isDepartment, seriesHref, type Department } from "@/lib/department";

type Params = { department: string; categorySlug: string };
type SearchParams = { page?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, categorySlug } = await params;
  if (!isDepartment(department)) return {};
  const category = await getCategoryBySlug(department, categorySlug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw, categorySlug } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const category = await getCategoryBySlug(department, categorySlug);
  if (!category) notFound();

  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items: products, pageCount } = await getProducts(department, { categorySlug }, page);

  return (
    <Container className="py-12">
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={departmentHref(department)} className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </div>

      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground">{category.name}</h1>
        <p className="mt-2 text-muted-foreground">Across every series.</p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal
              key={product.id}
              delay={Math.min(i, 6) * 0.05}
              className="flex flex-col gap-2"
            >
              <ProductCard product={product} />
              {product.series && (
                <Link
                  href={seriesHref(product.series)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {product.series.name}
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No {category.name.toLowerCase()} published yet.
        </p>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(p) => `/${department}/category/${categorySlug}?page=${p}`}
      />
    </Container>
  );
}
