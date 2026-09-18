import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getApprovedReviews, getProductBySlug } from "@/lib/data/catalog";
import { ProductDetail } from "@/components/product-detail";
import { productImageUrl } from "@/lib/supabase/storage";
import { getDefaultVariant } from "@/lib/colors";
import { productHref, isDepartment, seriesHref, seriesIndexHref, type Department } from "@/lib/department";
import { SITE_URL } from "@/lib/site";
import { Container } from "@/components/container";

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
    openGraph: {
      title,
      description,
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

  const reviews = await getApprovedReviews(product.id);
  const defaultVariant = getDefaultVariant(product.variants);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku ?? undefined,
    image: product.product_images.map((img) => productImageUrl(img.storage_path)),
    brand: { "@type": "Brand", name: "Aakar" },
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
        {defaultVariant && (
          <>
            <span>/</span>
            <span className="text-foreground">{defaultVariant.color_name}</span>
          </>
        )}
      </div>

      <ProductDetail product={product} reviews={reviews} />
    </Container>
  );
}
