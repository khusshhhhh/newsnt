"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { isMissingBlurColumn, sanitizeBlurDataUrl, withoutBlur } from "@/lib/blur-placeholder";
import { revalidateCatalog } from "./_shared";

export async function addProductImage(
  productId: string,
  storagePath: string,
  displayOrder: number,
  variantId: string | null = null,
  blurDataUrl: string | null = null
) {
  const { supabase } = await requireAdmin("catalog");
  const row = {
    product_id: productId,
    variant_id: variantId,
    storage_path: storagePath,
    blur_data_url: sanitizeBlurDataUrl(blurDataUrl),
    display_order: displayOrder,
  };
  const insert = (values: typeof row) => supabase.from("product_images").insert(values).select().single();
  let { data, error } = await insert(row);
  if (isMissingBlurColumn(error)) ({ data, error } = await insert(withoutBlur(row)));

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function reorderProductImages(productId: string, orderedIds: string[]) {
  const { supabase } = await requireAdmin("catalog");
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
  const { supabase } = await requireAdmin("catalog");
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
