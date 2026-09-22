"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { departmentSchema } from "./_shared";
import type { OrderStatus, QuoteLineItem } from "@/lib/supabase/types";

const ORDER_STATUSES: OrderStatus[] = ["confirmed", "in_production", "shipped", "delivered", "cancelled"];

const orderItemSchema = z.object({
  name: z.string().trim().min(1),
  variantLabel: z.string().trim().nullable(),
  sku: z.string().trim().nullable(),
  seriesName: z.string().trim().nullable(),
  quantity: z.coerce.number().int().positive().max(999),
  unitPrice: z.coerce.number().nonnegative().nullable(),
}) satisfies z.ZodType<QuoteLineItem>;

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  department: departmentSchema,
  items: z.array(orderItemSchema).min(1, "Add at least one product to the order"),
  notes: z.string().trim().max(2000).optional(),
  quoteId: z.string().uuid().nullable().optional(),
  inquiryId: z.string().uuid().nullable().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().slice(0, 5).toUpperCase();
  return `ORD-${date}-${suffix}`;
}

/** Creates an order — from a specific quote, straight off an inquiry's referenced products, or from scratch — and marks the source inquiry "won" if there is one. */
export async function createOrder(rawInput: CreateOrderInput) {
  const parsed = createOrderSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid order");

  const supabase = await createClient();
  const orderNumber = generateOrderNumber();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: parsed.data.customerId,
      quote_id: parsed.data.quoteId ?? null,
      inquiry_id: parsed.data.inquiryId ?? null,
      department: parsed.data.department,
      items: parsed.data.items,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (parsed.data.inquiryId) {
    await supabase.from("inquiries").update({ status: "won" }).eq("id", parsed.data.inquiryId);
  }

  await logActivity({
    action: "create",
    entity_type: "order",
    entity_id: data.id,
    entity_name: orderNumber,
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/customers/${parsed.data.customerId}`);
  revalidatePath("/admin");
  return data;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid status");

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("customer_id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({ action: "update", entity_type: "order", entity_id: orderId, entity_name: status });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  if (order) revalidatePath(`/admin/customers/${order.customer_id}`);
  return { success: true as const };
}

export async function updateOrderNotes(orderId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
}
