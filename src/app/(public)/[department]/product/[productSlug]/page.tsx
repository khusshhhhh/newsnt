import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getProductBySlug } from "@/lib/data/catalog";
import { ProductMedia } from "@/components/product-media";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/supabase/storage";
import { productHref, isDepartment, seriesHref, seriesIndexHref, type Department } from "@/lib/department";
import { SITE_URL } from "@/lib/site";
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

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <ProductMedia
            productName={product.name}
            generalImages={product.product_images}
            variants={product.variants}
          />
        </Reveal>

        <div>
          <Reveal delay={0.1}>
            {product.series && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {product.series.name}
                <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
                {product.category.name}
              </span>
            )}
            <h1 className="mt-3 font-heading text-4xl font-black leading-[0.98] tracking-tight text-foreground sm:text-5xl">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-6 max-w-md border-l-2 border-border pl-4 leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}
          </Reveal>

          <Reveal delay={0.18} className="mt-8 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Price</span>
              <span className="font-heading text-2xl text-foreground">
                {formatPrice(product.price, product.currency)}
              </span>
            </div>
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_ENQUIRY_EMAIL ?? ""}?subject=${enquirySubject}&body=${enquiryBody}`}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="size-4" />
              Enquire about this product
            </a>
          </Reveal>

          {(product.sku || specs.length > 0) && (
            <Reveal delay={0.24} className="mt-10 border-t border-border pt-8">
              <div className="mb-5 flex items-baseline gap-3">
                <span className="font-heading text-sm font-black text-muted-foreground/40">02</span>
                <h2 className="font-heading text-lg text-foreground">Specifications</h2>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {product.sku && (
                  <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">SKU</dt>
                    <dd className="mt-1 font-heading text-sm text-foreground">{product.sku}</dd>
                  </div>
                )}
                {specs.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{key}</dt>
                    <dd className="mt-1 font-heading text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
        </div>
      </div>
    </Container>
  );
}
