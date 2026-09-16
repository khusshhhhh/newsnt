"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import { revalidateCatalog } from "./_shared";

const resourceSchema = z.object({
  name: z.string().trim().min(1, "Resource name is required"),
  storage_path: z.string().trim().min(1, "File is required"),
  file_name: z.string().optional(),
  display_order: z.coerce.number().int().default(0),
});

export async function addProductResource(productId: string, formData: FormData) {
  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    storage_path: formData.get("storage_path"),
    file_name: formData.get("file_name") ?? undefined,
    display_order: formData.get("display_order") ?? 0,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid resource");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_resources")
    .insert({ product_id: productId, ...parsed.data })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function deleteProductResource(resourceId: string, productId: string) {
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("product_resources")
    .select("storage_path")
    .eq("id", resourceId)
    .single();

  await supabase.from("product_resources").delete().eq("id", resourceId);
  if (resource?.storage_path) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([resource.storage_path]);
  }
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}
