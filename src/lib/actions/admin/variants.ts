"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { computeVariantSku } from "@/lib/colors";
import { revalidateCatalog } from "./_shared";
import type { StockStatus } from "@/lib/supabase/types";

const STOCK_STATUSES: StockStatus[] = ["in_stock", "made_to_order", "out_of_stock", "discontinued"];

const variantSchema = z.object({
  color_name: z.string().trim().min(1, "Choose a finish"),
  price: z.coerce.number().nonnegative().nullable(),
  display_order: z.coerce.number().int().default(0),
});

export async function addProductVariant(productId: string, formData: FormData) {
  const priceRaw = String(formData.get("price") ?? "");
  const parsed = variantSchema.safeParse({
    color_name: formData.get("color_name"),
    price: priceRaw ? Number(priceRaw) : null,
    display_order: formData.get("display_order") ?? 0,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid color");

  const { supabase } = await requireAdmin("catalog");
  const [{ data: product }, { data: finish }] = await Promise.all([
    supabase.from("products").select("sku").eq("id", productId).maybeSingle(),
    supabase
      .from("finishes")
      .select("name, code, hex")
      .eq("name", parsed.data.color_name)
      .maybeSingle(),
  ]);

  if (!product?.sku) {
    throw new Error("Set a SKU prefix on the product before adding colors.");
  }
  if (!finish) {
    throw new Error("That finish no longer exists — pick another one.");
  }

  const { color_name, price, display_order } = parsed.data;
  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: productId,
      color_name,
      color_hex: finish.hex,
      sku: computeVariantSku(product.sku, finish.code),
      price,
      display_order,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      error.code === "23505" ? `${color_name} has already been added to this product.` : error.message
    );
  }
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function updateProductVariantPrice(
  variantId: string,
  productId: string,
  price: number | null
) {
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    throw new Error("Enter a valid price");
  }

  const { supabase } = await requireAdmin("catalog");
  const { data, error } = await supabase
    .from("product_variants")
    .update({ price })
    .eq("id", variantId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function updateProductVariantStock(
  variantId: string,
  productId: string,
  stockStatus: StockStatus | null
) {
  if (stockStatus != null && !STOCK_STATUSES.includes(stockStatus)) {
    throw new Error("Invalid stock status");
  }

  const { supabase } = await requireAdmin("catalog");
  const { data, error } = await supabase
    .from("product_variants")
    .update({ stock_status: stockStatus })
    .eq("id", variantId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return data;
}

export async function deleteProductVariant(variantId: string, productId: string) {
  const { supabase } = await requireAdmin("catalog");
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("variant_id", variantId);

  await supabase.from("product_variants").delete().eq("id", variantId);

  const paths = (images ?? []).map((i) => i.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("media").remove(paths);
  }
  revalidateCatalog();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}
