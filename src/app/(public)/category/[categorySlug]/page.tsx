import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug, getProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";

type Params = { categorySlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  const products = await getProducts({ categorySlug });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground">{category.name}</h1>
        <p className="mt-2 text-muted-foreground">Across every series.</p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-2">
              <ProductCard product={product} />
              {product.series && (
                <Link
                  href={`/series/${product.series.slug}`}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {product.series.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No {category.name.toLowerCase()} published yet.
        </p>
      )}
    </div>
  );
}
