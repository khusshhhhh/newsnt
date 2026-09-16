import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/catalog";
import { ProductMedia } from "@/components/product-media";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/supabase/storage";
import { productHref, isDepartment, seriesHref, seriesIndexHref, type Department } from "@/lib/department";
import { SITE_URL } from "@/lib/site";
import { Separator } from "@/components/ui/separator";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";

type Params = { department: string; productSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { department, productSlug } = await params;
  if (!isDepartment(department)) return {};
  const product = await getProductBySlug(department, productSlug);
  if (!product) return { title: "Product" };

  const image = product.product_images[0];

  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: image ? [{ url: productImageUrl(image.storage_path) }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { department: raw, productSlug } = await params;
  if (!isDepartment(raw)) notFound();
  const department: Department = raw;

  const product = await getProductBySlug(department, productSlug);
  if (!product) notFound();

  const specs = Object.entries(product.specs ?? {});
  const enquirySubject = encodeURIComponent(`Enquiry: ${product.name}`);
  const enquiryBody = encodeURIComponent(
    `Hi, I'd like to know more about ${product.name}${
      product.series ? ` (${product.series.name})` : ""
    }.`
  );

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: product.product_images.map((img) => productImageUrl(img.storage_path)),
    brand: { "@type": "Brand", name: "Aakar" },
    ...(product.price != null && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: product.currency,
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}${productHref(product)}`,
      },
    }),
  };

  return (
    <Container className="py-12">
      <script
        type="application/ld+json"
        // Escape "<" so admin-entered text can't break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={seriesIndexHref(department)} className="transition-colors hover:text-foreground">
          Series
        </Link>
        {product.series && (
          <>
            <span>/</span>
            <Link href={seriesHref(product.series)} className="transition-colors hover:text-foreground">
              {product.series.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <ProductMedia
            productName={product.name}
            generalImages={product.product_images}
            variants={product.variants}
          />
        </Reveal>

        <Reveal delay={0.1}>
          {product.series && (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
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
            <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          <a
            href={`mailto:${process.env.NEXT_PUBLIC_ENQUIRY_EMAIL ?? ""}?subject=${enquirySubject}&body=${enquiryBody}`}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Enquire about this product
          </a>

          {(product.sku || specs.length > 0) && (
            <>
              <Separator className="my-8" />
              <h2 className="mb-4 font-heading text-lg text-foreground">Specifications</h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {product.sku && (
                  <div className="flex justify-between border-b border-border pb-2 text-sm sm:flex-col sm:justify-start sm:border-0 sm:pb-0">
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="text-foreground">{product.sku}</dd>
                  </div>
                )}
                {specs.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b border-border pb-2 text-sm sm:flex-col sm:justify-start sm:border-0 sm:pb-0"
                  >
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Reveal>
      </div>
    </Container>
  );
}
