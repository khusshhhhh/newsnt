import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { Separator } from "@/components/ui/separator";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: series }, { data: categories }, { data: images }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase.from("series").select("*").order("display_order", { ascending: true }),
      supabase.from("categories").select("*").order("display_order", { ascending: true }),
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("display_order", { ascending: true }),
    ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit product</h1>
      <div className="mt-8">
        <ProductForm product={product} series={series ?? []} categories={categories ?? []} />
      </div>

      <Separator className="my-10 max-w-2xl" />

      <div className="max-w-2xl">
        <h2 className="mb-4 font-heading text-lg text-foreground">Photos</h2>
        <ProductImageManager productId={product.id} images={images ?? []} />
      </div>
    </div>
  );
}
