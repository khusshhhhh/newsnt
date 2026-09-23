import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveFinishes, getFinishByCode, getProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Pagination } from "@/components/pagination";
import { EmptyListing } from "@/components/empty-listing";
import { ListingControls } from "@/components/listing-controls";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { listingHref, parseListing, type ListingSearchParams } from "@/lib/listing";
import { cn } from "@/lib/utils";
import { departmentHref, finishHref, isDepartment, type Department } from "@/lib/department";

type Params = { department: string; finishCode: string };
type SearchParams = ListingSearchParams;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { finishCode } = await params;
  const finish = await getFinishByCode(finishCode);
  if (!finish) return { title: "Finish" };
  const title = `${finish.name} finish`;
  const description = `Every Flow product available in ${finish.name}.`;
  return { title, description, openGraph: { title, description } };
}

export default async function FinishPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw, finishCode } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const finish = await getFinishByCode(finishCode);
  if (!finish) notFound();

  const { page, sort, inStockOnly } = parseListing(await searchParams);
  const basePath = finishHref(department, finishCode);
  const [{ items: products, pageCount, total }, finishes] = await Promise.all([
    getProducts(department, { finishCode }, page, { sort, inStockOnly }),
    getActiveFinishes(),
  ]);

  return (
    <Container className="py-12">
      <Breadcrumbs items={[{ name: "Home", href: departmentHref(department) }, { name: finish.name }]} />

      <div className="mb-8 flex items-center gap-3">
        <span
          aria-hidden
          className="size-8 shrink-0 rounded-full ring-1 ring-border ring-offset-2 ring-offset-background"
          style={{ background: finish.hex }}
        />
        <div>
          <h1 className="font-heading text-3xl text-foreground">{finish.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every product available in this finish.</p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {finishes.map((f) => (
          <Link
            key={f.id}
            href={finishHref(department, f.code)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
              f.code === finishCode
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2.5 rounded-full ring-1 ring-offset-1",
                f.code === finishCode
                  ? "ring-background/40 ring-offset-foreground"
                  : "ring-border ring-offset-background"
              )}
              style={{ background: f.hex }}
            />
            {f.name}
          </Link>
        ))}
      </div>

      <ListingControls sort={sort} inStockOnly={inStockOnly} total={total} />

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={Math.min(i, 6) * 0.05}>
              <ProductCard product={product} preferredColorName={finish.name} />
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyListing filtered={inStockOnly} resetHref={basePath}>
          No products published in {finish.name} yet.
        </EmptyListing>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(p) => listingHref(basePath, { sort, inStockOnly, page: p })}
      />
    </Container>
  );
}
