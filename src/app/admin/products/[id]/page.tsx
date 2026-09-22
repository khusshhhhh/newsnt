import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { VariantManager } from "@/components/admin/variant-manager";
import { ResourceManager } from "@/components/admin/resource-manager";
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel } from "@/components/ui/tabs";
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
    { data: finishes },
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
    supabase.from("finishes").select("*").eq("is_active", true).order("display_order", { ascending: true }),
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
      <p className="mt-1 truncate text-sm text-muted-foreground">{product.name}</p>

      <Tabs defaultValue="details" className="mt-6">
        <TabsList>
          <TabsIndicator />
          <TabsTab value="details">Details</TabsTab>
          <TabsTab value="photos">Photos{images?.length ? ` (${images.length})` : ""}</TabsTab>
          <TabsTab value="colors">Colors{sortedVariants.length ? ` (${sortedVariants.length})` : ""}</TabsTab>
          <TabsTab value="resources">
            Resources{resources?.length ? ` (${resources.length})` : ""}
          </TabsTab>
        </TabsList>

        <TabsPanel value="details">
          <ProductForm product={product} series={series ?? []} categories={categories ?? []} />
        </TabsPanel>

        <TabsPanel value="photos">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm text-muted-foreground">
              The default gallery shown when no color is selected.
            </p>
            <ProductImageManager productId={product.id} images={images ?? []} />
          </div>
        </TabsPanel>

        <TabsPanel value="colors">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm text-muted-foreground">
              Add the finishes this product comes in. Each color can have its own photos —
              shoppers switch between them on the product page.
            </p>
            <VariantManager productId={product.id} variants={sortedVariants} finishes={finishes ?? []} />
          </div>
        </TabsPanel>

        <TabsPanel value="resources">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm text-muted-foreground">
              Downloadable files shown on the product page — spec sheets, certifications, install
              guides.
            </p>
            <ResourceManager productId={product.id} resources={resources ?? []} />
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
}
