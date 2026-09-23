import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveFinishes, getApprovedReviews, getProductBySlug, getRelatedProducts } from "@/lib/data/catalog";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { productImageUrl } from "@/lib/supabase/storage";
import { getDefaultVariant } from "@/lib/colors";
import { productHref, isDepartment, seriesHref, seriesIndexHref, type Department } from "@/lib/department";
import { SITE_URL } from "@/lib/site";
import { Container } from "@/components/container";

type Params = { department: string; productSlug: string };
type SearchParams = { finish?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, productSlug } = await params;
  if (!isDepartment(department)) return {};
  const product = await getProductBySlug(department, productSlug);
  if (!product) return { title: "Product" };

  const defaultVariant = getDefaultVariant(product.variants);
  const ogImages = defaultVariant && defaultVariant.product_images.length > 0
    ? defaultVariant.product_images
    : product.product_images;
  const image = ogImages[0];

  const title = product.meta_title || product.name;
  const description =
    product.meta_description ||
    (product.series ? `${product.name} — part of the ${product.series.name} series.` : undefined);

  return {
    title,
    description,
    alternates: { canonical: productHref(product) },
    openGraph: {
      title,
      description,
      images: image ? [{ url: productImageUrl(image.storage_path) }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { department: raw, productSlug } = await params;
  const { finish: finishCode } = await searchParams;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const product = await getProductBySlug(department, productSlug);
  if (!product) notFound();

  const [reviews, finishes, related] = await Promise.all([
    getApprovedReviews(product.id),
    getActiveFinishes(),
    getRelatedProducts(department, product.id, product.series_id, product.category_id),
  ]);
  const defaultVariant = getDefaultVariant(product.variants);
  const finishCodes = Object.fromEntries(finishes.map((f) => [f.name, f.code]));
  const initialFinishName = finishCode ? finishes.find((f) => f.code === finishCode)?.name : undefined;
  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku ?? undefined,
    image: product.product_images.map((img) => productImageUrl(img.storage_path)),
    brand: { "@type": "Brand", name: "Flow" },
    ...(product.description && { description: product.description }),
    ...(averageRating != null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating.toFixed(1),
        reviewCount: reviews.length,
      },
    }),
    ...(product.price != null && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "AUD",
        availability: `https://schema.org/${
          { in_stock: "InStock", made_to_order: "PreOrder", out_of_stock: "OutOfStock", discontinued: "Discontinued" }[
            product.stock_status
          ]
        }`,
        url: `${SITE_URL}${productHref(product)}`,
      },
    }),
  };

  return (
    <Container className="py-12">
      <JsonLd data={productJsonLd} />
      <Breadcrumbs
        items={[
          { name: "Series", href: seriesIndexHref(department) },
          ...(product.series ? [{ name: product.series.name, href: seriesHref(product.series) }] : []),
          { name: product.name },
        ]}
      />

      <ProductDetail
        product={product}
        reviews={reviews}
        initialFinishName={initialFinishName ?? defaultVariant?.color_name}
        finishCodes={finishCodes}
      />

      {related.length > 0 && (
        <section className="mt-20 border-t border-border pt-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-6 font-heading text-2xl text-foreground">
            {product.series ? `More from ${product.series.name}` : "You may also like"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
