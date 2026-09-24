"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { renderToBuffer } from "@react-pdf/renderer";
import { OrderPdfDocument, type OrderDocumentKind } from "@/lib/pdf/order-pdf";
import { departmentSchema, discountColumns, discountSchema } from "./_shared";
import { discountFromRow, discountedTotal, type Discount } from "@/lib/discount";
import type { OrderStatus, PaymentStatus, QuoteLineItem } from "@/lib/supabase/types";

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
  discount: discountSchema,
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

  const { supabase } = await requireAdmin("sales");
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
      ...discountColumns(parsed.data.discount),
      total: discountedTotal(parsed.data.items, parsed.data.discount),
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (parsed.data.inquiryId) {
    await supabase.from("inquiries").update({ status: "won" }).eq("id", parsed.data.inquiryId);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/customers/${parsed.data.customerId}`);
  revalidatePath("/admin");
  return data;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid status");

  const { supabase } = await requireAdmin("sales");
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("customer_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  if (order) revalidatePath(`/admin/customers/${order.customer_id}`);
  return { success: true as const };
}

export async function updateOrderNotes(orderId: string, notes: string) {
  const { supabase } = await requireAdmin("sales");
  const { error } = await supabase
    .from("orders")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
}

/** Sets or clears an existing order's discount and re-derives its total from the stored line items. */
export async function updateOrderDiscount(orderId: string, rawDiscount: Discount | null) {
  const parsed = discountSchema.safeParse(rawDiscount);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid discount");

  const { supabase } = await requireAdmin("sales");
  const { data: order, error: loadError } = await supabase
    .from("orders")
    .select("items")
    .eq("id", orderId)
    .single();
  if (loadError || !order) throw new Error("Order not found");

  const next = { ...discountColumns(parsed.data), total: discountedTotal(order.items, parsed.data) };
  const { error } = await supabase
    .from("orders")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/reports");
  return next;
}

const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "deposit_paid", "paid", "refunded"];

const paymentSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
  depositAmount: z.coerce.number().nonnegative().nullable(),
  amountPaid: z.coerce.number().nonnegative(),
  fulfilmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export type OrderPaymentInput = z.infer<typeof paymentSchema>;

export async function updateOrderPayment(orderId: string, rawInput: OrderPaymentInput) {
  const parsed = paymentSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment details");

  const { supabase } = await requireAdmin("sales");
  const next = {
    payment_status: parsed.data.paymentStatus,
    deposit_amount: parsed.data.depositAmount,
    amount_paid: parsed.data.amountPaid,
    fulfilment_date: parsed.data.fulfilmentDate,
  };
  const { error } = await supabase
    .from("orders")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/reports");
}

/** Renders an order's invoice or packing slip for download. */
export async function downloadOrderDocument(orderId: string, kind: OrderDocumentKind) {
  const { supabase } = await requireAdmin("sales");
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, customer:customers(name, email, phone)")
    .eq("id", orderId)
    .single();
  if (error || !order?.customer) throw new Error("Order not found");

  const buffer = await renderToBuffer(
    <OrderPdfDocument
      kind={kind}
      orderNumber={order.order_number}
      createdAt={order.created_at}
      customerName={order.customer.name}
      customerEmail={order.customer.email}
      customerPhone={order.customer.phone}
      items={order.items as QuoteLineItem[]}
      discount={discountFromRow(order)}
      notes={order.notes}
      paymentStatus={order.payment_status}
      amountPaid={Number(order.amount_paid ?? 0)}
      fulfilmentDate={order.fulfilment_date}
    />
  );
  return {
    filename: `${kind}-${order.order_number.toLowerCase()}.pdf`,
    base64: buffer.toString("base64"),
  };
}
