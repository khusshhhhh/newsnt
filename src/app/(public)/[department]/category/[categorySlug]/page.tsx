import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveFinishes, getFinishCounts, getCategoryBySlug, getProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { EmptyListing } from "@/components/empty-listing";
import { FinishFilterPills } from "@/components/finish-filter-pills";
import { ListingControls } from "@/components/listing-controls";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { listingHref, parseListing, type ListingSearchParams } from "@/lib/listing";
import { categoryHref, departmentCopy, departmentHref, isDepartment, type Department } from "@/lib/department";

type Params = { department: string; categorySlug: string };
type SearchParams = ListingSearchParams;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, categorySlug } = await params;
  if (!isDepartment(department)) return {};
  const category = await getCategoryBySlug(department, categorySlug);
  if (!category) return { title: "Category" };
  const description = `${category.name} from Flow ${departmentCopy(department).label} — every series and finish.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: categoryHref(category) },
    openGraph: { title: category.name, description },
  };
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

  const { page, finish: finishCode, sort, inStockOnly } = parseListing(await searchParams);
  const basePath = categoryHref(category);
  const [{ items: products, pageCount, total }, finishes, finishCounts] = await Promise.all([
    getProducts(department, { categorySlug, finishCode }, page, { sort, inStockOnly }),
    getActiveFinishes(),
    getFinishCounts(department, { categorySlug }, inStockOnly),
  ]);

  return (
    <Container className="py-12">
      <Breadcrumbs items={[{ name: "Home", href: departmentHref(department) }, { name: category.name }]} />

      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground">{category.name}</h1>
        <p className="mt-2 text-muted-foreground">Across every series.</p>
      </div>

      <FinishFilterPills
        finishes={finishes}
        basePath={basePath}
        activeCode={finishCode}
        hrefFor={(finish) => listingHref(basePath, { finish, sort, inStockOnly })}
        counts={finishCounts}
      />
      <ListingControls sort={sort} inStockOnly={inStockOnly} total={total} />

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
              <ProductCard
                product={product}
                eager={i < 4}
                preferredColorName={finishes.find((f) => f.code === finishCode)?.name}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyListing filtered={Boolean(finishCode || inStockOnly)} resetHref={basePath}>
          No {category.name.toLowerCase()} published yet.
        </EmptyListing>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(p) => listingHref(basePath, { finish: finishCode, sort, inStockOnly, page: p })}
      />
    </Container>
  );
}
