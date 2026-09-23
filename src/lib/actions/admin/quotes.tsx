"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/admin-guard";
import { escapeHtml, escapeHtmlMultiline, sendEmail } from "@/lib/email";
import { ilikeContainsPattern } from "@/lib/search";
import { logActivity } from "@/lib/data/activity";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";
import { SITE_URL } from "@/lib/site";
import { departmentSchema } from "./_shared";
import type { AdminInquiryProduct } from "@/lib/inquiry-lines";
import type { Department } from "@/lib/department";
import type { QuoteLineItem } from "@/lib/supabase/types";

const lineItemSchema = z.object({
  name: z.string().trim().min(1),
  variantLabel: z.string().trim().nullable(),
  sku: z.string().trim().nullable(),
  seriesName: z.string().trim().nullable(),
  quantity: z.coerce.number().int().positive().max(999),
  unitPrice: z.coerce.number().nonnegative().nullable(),
}) satisfies z.ZodType<QuoteLineItem>;

const quoteSchema = z.object({
  inquiryId: z.string().uuid(),
  notes: z.string().trim().max(2000).default(""),
  items: z.array(lineItemSchema).min(1, "Add at least one product to the quote"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

const newQuoteSchema = z.object({
  customerId: z.string().uuid(),
  department: departmentSchema,
  notes: z.string().trim().max(2000).default(""),
  items: z.array(lineItemSchema).min(1, "Add at least one product to the quote"),
});

export type NewQuoteInput = z.infer<typeof newQuoteSchema>;

/** `Q-<date>-<random>` — unique per send, so re-quoting the same inquiry doesn't collide with `quotes.quote_number`. */
function generateQuoteNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().slice(0, 5).toUpperCase();
  return `Q-${date}-${suffix}`;
}

function quoteFilename(quoteNumber: string, customerName: string) {
  const safeName = customerName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "customer";
  return `quote-${quoteNumber.toLowerCase()}-${safeName}.pdf`;
}

function quoteTotal(items: QuoteLineItem[]) {
  return items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
}

async function renderQuotePdf(params: {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  items: QuoteLineItem[];
  notes: string;
}) {
  return renderToBuffer(
    <QuotePdfDocument
      quoteNumber={params.quoteNumber}
      customerName={params.customerName}
      customerEmail={params.customerEmail}
      customerPhone={params.customerPhone}
      items={params.items}
      notes={params.notes}
    />
  );
}

async function loadInquiry(inquiryId: string) {
  const { supabase } = await requireAdmin("sales");
  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select("id, name, email, phone, status, department, customer_id")
    .eq("id", inquiryId)
    .single();
  if (error || !inquiry) throw new Error("Inquiry not found");
  return inquiry;
}

/** Every inquiry gets a customer_id via upsert_customer() at submit time — this only covers rows from before that existed. */
async function resolveCustomerId(inquiry: {
  id: string;
  customer_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  department: string;
}) {
  if (inquiry.customer_id) return inquiry.customer_id;
  const { supabase } = await requireAdmin("sales");
  const { data, error } = await supabase.rpc("upsert_customer", {
    p_email: inquiry.email,
    p_name: inquiry.name,
    p_phone: inquiry.phone,
    p_department: inquiry.department,
  });
  if (error || !data) throw new Error("Could not resolve a customer for this inquiry");
  await supabase.from("inquiries").update({ customer_id: data }).eq("id", inquiry.id);
  return data;
}

/** Renders the quote PDF and hands back base64 bytes for a client-side download — nothing is emailed or persisted. */
export async function previewQuotePdf(rawInput: QuoteInput) {
  const parsed = quoteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote");

  const inquiry = await loadInquiry(parsed.data.inquiryId);
  const quoteNumber = generateQuoteNumber();
  const buffer = await renderQuotePdf({
    quoteNumber,
    customerName: inquiry.name,
    customerEmail: inquiry.email,
    customerPhone: inquiry.phone,
    items: parsed.data.items,
    notes: parsed.data.notes,
  });

  return {
    filename: quoteFilename(quoteNumber, inquiry.name),
    base64: buffer.toString("base64"),
  };
}

/**
 * Shared by both quote-creation paths (from an existing inquiry, or built
 * from scratch in /admin/quotes/new): renders the PDF, emails it with an
 * accept/decline link, and persists the quote row.
 */
async function dispatchQuote(params: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  department: Department;
  inquiryId: string | null;
  notes: string;
  items: QuoteLineItem[];
}) {
  const quoteNumber = generateQuoteNumber();
  const buffer = await renderQuotePdf({
    quoteNumber,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    items: params.items,
    notes: params.notes,
  });
  const total = quoteTotal(params.items);

  const { supabase } = await requireAdmin("sales");
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      quote_number: quoteNumber,
      inquiry_id: params.inquiryId,
      customer_id: params.customerId,
      department: params.department,
      items: params.items,
      notes: params.notes || null,
      total,
    })
    .select("accept_token")
    .single();
  if (quoteError) throw new Error(quoteError.message);

  const acceptUrl = `${SITE_URL}/quote/${quote.accept_token}`;
  const result = await sendEmail({
    to: params.customerEmail,
    subject: `Your quote from Flow (${quoteNumber})`,
    html: `
      <p>Hi ${escapeHtml(params.customerName)},</p>
      <p>Thanks for your interest — your quote is attached as a PDF.</p>
      ${params.notes ? `<p>${escapeHtmlMultiline(params.notes)}</p>` : ""}
      <p><a href="${acceptUrl}">View this quote and accept or decline it</a>.</p>
      <p>Let us know if you have any questions.</p>
    `,
    attachments: [{ filename: quoteFilename(quoteNumber, params.customerName), content: buffer }],
  });

  if (result.skipped || result.error) {
    await supabase.from("quotes").delete().eq("quote_number", quoteNumber);
    throw new Error(
      result.skipped
        ? "Email isn't configured (RESEND_API_KEY / EMAIL_FROM) — can't send the quote."
        : (result.error ?? "Failed to send the quote email.")
    );
  }

  if (params.inquiryId) {
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("status")
      .eq("id", params.inquiryId)
      .maybeSingle();
    // Advance the pipeline stage on send, but never downgrade a deal that's
    // already been won or lost just because a follow-up quote went out.
    if (inquiry && (inquiry.status === "new" || inquiry.status === "contacted")) {
      await supabase.from("inquiries").update({ status: "quoted" }).eq("id", params.inquiryId);
    }
  }

  await logActivity({
    action: "update",
    entity_type: "inquiry",
    entity_id: params.inquiryId ?? params.customerId,
    entity_name: `Quote sent to ${params.customerEmail} (${quoteNumber}, $${total.toFixed(2)})`,
  });

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${params.customerId}`);
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
  return { success: true as const };
}

/** Renders the quote PDF, emails it to the inquiry's own email address, and records it against the customer. */
export async function sendQuotePdf(rawInput: QuoteInput) {
  const parsed = quoteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote");

  const inquiry = await loadInquiry(parsed.data.inquiryId);
  const customerId = await resolveCustomerId(inquiry);

  return dispatchQuote({
    customerId,
    customerName: inquiry.name,
    customerEmail: inquiry.email,
    customerPhone: inquiry.phone,
    department: inquiry.department,
    inquiryId: inquiry.id,
    notes: parsed.data.notes,
    items: parsed.data.items,
  });
}

/** Builds and sends a quote from scratch — any customer, any products, no inquiry required. */
export async function createAndSendQuote(rawInput: NewQuoteInput) {
  const parsed = newQuoteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote");

  const { supabase } = await requireAdmin("sales");
  const { data: customer, error } = await supabase
    .from("customers")
    .select("name, email, phone")
    .eq("id", parsed.data.customerId)
    .single();
  if (error || !customer) throw new Error("Customer not found");

  return dispatchQuote({
    customerId: parsed.data.customerId,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    department: parsed.data.department,
    inquiryId: null,
    notes: parsed.data.notes,
    items: parsed.data.items,
  });
}

/** Re-renders a previously sent quote's PDF from its stored line items, for re-downloading from a customer's profile. */
export async function downloadStoredQuotePdf(quoteId: string) {
  const { supabase } = await requireAdmin("sales");
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("quote_number, items, notes, customer:customers(name, email, phone)")
    .eq("id", quoteId)
    .single();
  if (error || !quote || !quote.customer) throw new Error("Quote not found");

  const buffer = await renderQuotePdf({
    quoteNumber: quote.quote_number,
    customerName: quote.customer.name,
    customerEmail: quote.customer.email,
    customerPhone: quote.customer.phone,
    items: quote.items as QuoteLineItem[],
    notes: quote.notes ?? "",
  });

  return {
    filename: quoteFilename(quote.quote_number, quote.customer.name),
    base64: buffer.toString("base64"),
  };
}

const customerSearchSchema = z.string().trim().min(1).max(200);

/** Live search for the quote builder's customer picker — name, email, or phone. */
export async function searchAdminCustomers(rawQuery: string) {
  const parsed = customerSearchSchema.safeParse(rawQuery);
  if (!parsed.success) return [];

  const { supabase } = await requireAdmin("sales");
  const pattern = ilikeContainsPattern(parsed.data);
  if (!pattern) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, department")
    .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return data ?? [];
}

const newCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("A valid email is required"),
  phone: z.string().trim().max(40).optional(),
  department: departmentSchema.nullable(),
});

/** Creates or updates (by email) a customer directly from the admin panel — reuses the same upsert the public inquiry form calls. */
export async function upsertAdminCustomer(rawInput: z.infer<typeof newCustomerSchema>) {
  const parsed = newCustomerSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid customer");

  const { supabase } = await requireAdmin("sales");
  const { data, error } = await supabase.rpc("upsert_customer", {
    p_email: parsed.data.email,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone || null,
    p_department: parsed.data.department,
  });
  if (error || !data) throw new Error(error?.message ?? "Could not save this customer");

  revalidatePath("/admin/customers");
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email, phone, department")
    .eq("id", data)
    .single();
  return customer;
}

const productSearchSchema = z.string().trim().min(1).max(200);

/** Live search for the quote builder's product picker — name or SKU, either department. */
export async function searchAdminProducts(
  rawQuery: string,
  department?: Department
): Promise<AdminInquiryProduct[]> {
  const parsed = productSearchSchema.safeParse(rawQuery);
  if (!parsed.success) return [];

  const { supabase } = await requireAdmin("sales");
  const pattern = ilikeContainsPattern(parsed.data);
  if (!pattern) return [];
  let query = supabase
    .from("products")
    .select(
      "id, name, slug, department, sku, price, series(name), category:categories(name), product_images(storage_path, display_order), variants:product_variants(id, color_name, sku, price)"
    )
    .eq("is_published", true)
    .or(`name.ilike.${pattern},sku.ilike.${pattern}`)
    .order("name")
    .limit(8);
  if (department) query = query.eq("department", department);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminInquiryProduct[];
}
