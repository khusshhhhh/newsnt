import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { VariantManager } from "@/components/admin/variant-manager";
import { ResourceManager } from "@/components/admin/resource-manager";
import { Separator } from "@/components/ui/separator";
import type { ProductImage, ProductVariantWithImages } from "@/lib/supabase/types";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: product },
    { data: series },
    { data: categories },
    { data: images },
    { data: variants },
    { data: resources },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("series").select("*").order("display_order", { ascending: true }),
    supabase.from("categories").select("*").order("display_order", { ascending: true }),
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .is("variant_id", null)
      .order("display_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("*, product_images(*)")
      .eq("product_id", id)
      .order("display_order", { ascending: true }),
    supabase
      .from("product_resources")
      .select("*")
      .eq("product_id", id)
      .order("display_order", { ascending: true }),
  ]);

  if (!product) notFound();

  const sortedVariants: ProductVariantWithImages[] = (variants ?? []).map((v) => ({
    ...v,
    product_images: [...(v.product_images as ProductImage[])].sort(
      (a, b) => a.display_order - b.display_order
    ),
  }));

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit product</h1>
      <div className="mt-8">
        <ProductForm product={product} series={series ?? []} categories={categories ?? []} />
      </div>

      <Separator className="my-10 max-w-2xl" />

      <div className="max-w-2xl">
        <h2 className="mb-1 font-heading text-lg text-foreground">Photos</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The default gallery shown when no color is selected.
        </p>
        <ProductImageManager productId={product.id} images={images ?? []} />
      </div>

      <Separator className="my-10 max-w-2xl" />

      <div className="max-w-2xl">
        <h2 className="mb-1 font-heading text-lg text-foreground">Colors</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Add the finishes this product comes in. Each color can have its own
          photos — shoppers switch between them on the product page.
        </p>
        <VariantManager productId={product.id} variants={sortedVariants} />
      </div>

      <Separator className="my-10 max-w-2xl" />

      <div className="max-w-2xl">
        <h2 className="mb-1 font-heading text-lg text-foreground">Resources</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Downloadable files shown on the product page — spec sheets, certifications, install guides.
        </p>
        <ResourceManager productId={product.id} resources={resources ?? []} />
      </div>
    </div>
  );
}
