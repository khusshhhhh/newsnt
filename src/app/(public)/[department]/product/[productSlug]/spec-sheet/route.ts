import type { NextRequest } from "next/server";
import sharp from "sharp";
import { getActiveFinishes, getProductBySlug } from "@/lib/data/catalog";
import { getDefaultVariant } from "@/lib/colors";
import { formatPrice, productPriceLabel } from "@/lib/format";
import { isDepartment, productHref } from "@/lib/department";
import { documentUrl, productImageUrl } from "@/lib/supabase/storage";
import { STOCK_STATUS_LABEL } from "@/lib/stock-status";
import { SITE_URL } from "@/lib/site";
import { renderSpecSheetPdf } from "@/lib/pdf/spec-sheet-pdf";

const IMAGE_TIMEOUT_MS = 8000;

/**
 * The main photo as a JPEG the PDF can embed (uploads are WebP, which
 * react-pdf can't read). Any failure just leaves the sheet without a photo.
 */
async function loadImage(storagePath: string | undefined) {
  if (!storagePath) return null;
  try {
    const res = await fetch(productImageUrl(storagePath), { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(900, 900, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch (error) {
    console.error("Spec sheet image failed", error);
    return null;
  }
}

/**
 * A printable one-page PDF of a product — for builders and designers to hand
 * to clients. `?finish=CODE` picks the colour, like the product page itself.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/[department]/product/[productSlug]/spec-sheet">
) {
  const { department, productSlug } = await ctx.params;
  if (!isDepartment(department)) return new Response("Not found", { status: 404 });

  const [product, finishes] = await Promise.all([getProductBySlug(department, productSlug), getActiveFinishes()]);
  if (!product) return new Response("Not found", { status: 404 });

  const finishCode = request.nextUrl.searchParams.get("finish");
  const finishName = finishes.find((f) => f.code === finishCode)?.name?.toLowerCase();
  const variant =
    (finishName && product.variants.find((v) => v.color_name.toLowerCase() === finishName)) ||
    getDefaultVariant(product.variants);

  const image = await loadImage(
    (variant?.product_images[0] ?? product.product_images[0] ?? product.variants.find((v) => v.product_images.length > 0)?.product_images[0])
      ?.storage_path
  );

  const pdf = await renderSpecSheetPdf({
    name: product.name,
    seriesName: product.series?.name ?? null,
    categoryName: product.category.name,
    colourName: variant?.color_name ?? null,
    sku: variant?.sku ?? product.sku,
    priceLabel: variant ? formatPrice(variant.price ?? product.price) : productPriceLabel(product),
    availability: STOCK_STATUS_LABEL[variant?.stock_status ?? product.stock_status],
    specs: Object.entries(product.specs ?? {}),
    finishes: product.variants.map((v) => ({ name: v.color_name, hex: v.color_hex })),
    resources: product.resources.map((r) => ({ name: r.name, url: documentUrl(r.storage_path) })),
    image,
    productUrl: `${SITE_URL}${productHref(product)}${finishCode ? `?finish=${encodeURIComponent(finishCode)}` : ""}`,
    generatedOn: new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date()),
  });

  const fileName = `${product.slug}${variant ? `-${variant.color_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}-spec-sheet.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      // Short, since an admin edit can't purge the CDN copy of this response.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
