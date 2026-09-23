"use server";

import { z } from "zod";
import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { DEPARTMENTS } from "@/lib/department";
import { looksLikeBot, withinRateLimit } from "@/lib/rate-limit";
import {
  inquiryReference,
  sendCustomerInquiryReceipt,
  sendStaffInquiryNotification,
} from "@/lib/notifications";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.coerce.number().int().positive().max(999),
});

const schema = z.object({
  department: z.enum(DEPARTMENTS),
  product_ids: z.array(z.string().uuid()).max(500).optional(),
  items: z.array(itemSchema).max(100).optional(),
  name: z.string().trim().min(1, "Enter your name").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1, "Add a short message").max(5000),
});

export type InquiryState = { error?: string; success?: boolean; reference?: string };

export async function submitInquiry(
  _prevState: InquiryState | null,
  formData: FormData
): Promise<InquiryState> {
  if (!(await withinRateLimit("inquiry"))) {
    return { error: "Too many requests from this network — please try again in a few minutes." };
  }

  // Bots get a success response without anything being saved, so scripts
  // get no signal to adapt to.
  if (looksLikeBot(formData)) return { success: true };

  const productIdsRaw = formData.get("product_ids");
  const itemsRaw = formData.get("items");
  let items: unknown;
  if (typeof itemsRaw === "string" && itemsRaw) {
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      return { error: "Check the form and try again." };
    }
  }

  const parsed = schema.safeParse({
    department: formData.get("department"),
    product_ids: typeof productIdsRaw === "string" && productIdsRaw
      ? productIdsRaw.split(",").filter(Boolean)
      : undefined,
    items,
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  // `product_ids` (one id repeated per unit) is derived from the structured
  // `items` when present, so anything still reading the old column — and
  // rows submitted before `items` existed — keep working unchanged.
  const productIds = parsed.data.items
    ? parsed.data.items.flatMap((item) => Array<string>(item.quantity).fill(item.product_id))
    : (parsed.data.product_ids ?? null);

  // The cookie-free public client: the storefront always submits as the
  // anon role, even when an admin happens to be signed in on this browser.
  const supabase = createPublicClient();

  // Every inquiry belongs to a customer, keyed by email — upsert_customer()
  // creates the customer on first contact and refreshes name/phone/
  // department on every later one.
  const { data: customerId, error: customerError } = await supabase.rpc("upsert_customer", {
    p_email: parsed.data.email,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone ?? null,
    p_department: parsed.data.department,
  });
  if (customerError || !customerId) {
    console.error("upsert_customer RPC failed:", customerError);
    return { error: "Something went wrong — try again." };
  }

  const { data: inquiryId, error } = await supabase.rpc("submit_inquiry", {
    p_department: parsed.data.department,
    p_product_ids: productIds,
    p_items: parsed.data.items ?? null,
    p_customer_id: customerId,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone ?? null,
    p_message: parsed.data.message,
  });

  if (error || !inquiryId) {
    console.error("submit_inquiry RPC failed:", error);
    return { error: "Something went wrong — try again." };
  }

  const inquiry = {
    id: inquiryId,
    department: parsed.data.department,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message,
    items: parsed.data.items ?? null,
    product_ids: productIds,
  };

  // Emails go out after the response, so the visitor isn't kept waiting on
  // Resend. Whether the staff email failed is recorded on the inquiry, so it
  // shows up (with a retry button) in the admin panel instead of vanishing.
  after(async () => {
    const [staffError, customerNotified] = await Promise.all([
      sendStaffInquiryNotification(inquiry).catch((e: unknown) => (e instanceof Error ? e.message : "Unknown error")),
      sendCustomerInquiryReceipt(inquiry).catch(() => false),
    ]);
    const { error: recordError } = await supabase.rpc("record_inquiry_notification", {
      p_id: inquiryId,
      p_error: staffError,
      p_customer_notified: customerNotified,
    });
    if (recordError) console.error("record_inquiry_notification failed:", recordError);
  });

  return { success: true, reference: inquiryReference(inquiryId) };
}
