import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT, shapeProduct } from "@/lib/data/catalog";
import { ProductDetail } from "@/components/product-detail";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

/**
 * Renders a product exactly as the storefront would — including drafts,
 * which the public page can't show — using the admin's own session.
 */
export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const product = shapeProduct(data);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Preview{product.is_published ? "" : " — this product is a draft and isn't visible on the site yet"}.
        </span>
        <Link href={`/admin/products/${id}`} className="inline-flex items-center gap-1.5 text-foreground hover:underline">
          <ArrowLeft className="size-3.5" /> Back to editing
        </Link>
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
