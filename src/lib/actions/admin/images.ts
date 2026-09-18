"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { revalidateCatalog } from "./_shared";

export async function addProductImage(
  productId: string,
  storagePath: string,
  displayOrder: number,
  variantId: string | null = null
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      variant_id: variantId,
      storage_path: storagePath,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function reorderProductImages(productId: string, orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("product_images").update({ display_order: index }).eq("id", id)
    )
  );
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}

export async function deleteProductImage(imageId: string, productId: string) {
  const supabase = await createClient();
  const { data: image } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  await supabase.from("product_images").delete().eq("id", imageId);
  if (image?.storage_path) {
    await supabase.storage.from("media").remove([image.storage_path]);
  }
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}
