import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/catalog";
import { ProductGallery } from "@/components/product-gallery";
import { formatPrice } from "@/lib/format";
import { Separator } from "@/components/ui/separator";

type Params = { productSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  return {
    title: product?.name ?? "Product",
    description: product?.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product) notFound();

  const specs = Object.entries(product.specs ?? {});
  const enquirySubject = encodeURIComponent(`Enquiry: ${product.name}`);
  const enquiryBody = encodeURIComponent(
    `Hi, I'd like to know more about ${product.name}${
      product.series ? ` (${product.series.name})` : ""
    }.`
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/series" className="hover:text-foreground">
          Series
        </Link>
        {product.series && (
          <>
            <span>/</span>
            <Link
              href={`/series/${product.series.slug}`}
              className="hover:text-foreground"
            >
              {product.series.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.product_images ?? []}
          productName={product.name}
        />

        <div>
          {product.series && (
            <span className="text-xs uppercase tracking-wide text-primary">
              {product.series.name} · {product.category.name}
            </span>
          )}
          <h1 className="mt-2 font-heading text-3xl text-foreground sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-xl text-foreground">
            {formatPrice(product.price, product.currency)}
          </p>

          {product.description && (
            <p className="mt-6 text-muted-foreground">{product.description}</p>
          )}

          <a
            href={`mailto:${process.env.NEXT_PUBLIC_ENQUIRY_EMAIL ?? ""}?subject=${enquirySubject}&body=${enquiryBody}`}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Enquire about this product
          </a>

          {specs.length > 0 && (
            <>
              <Separator className="my-8" />
              <h2 className="mb-4 font-heading text-lg text-foreground">
                Specifications
              </h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-border/60 pb-2 text-sm sm:flex-col sm:justify-start sm:border-0 sm:pb-0">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
