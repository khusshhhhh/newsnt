"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/data/activity";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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

/** Renders the quote PDF, emails it to the inquiry's own email address, and records it against the customer. */
export async function sendQuotePdf(rawInput: QuoteInput) {
  const parsed = quoteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote");

  const inquiry = await loadInquiry(parsed.data.inquiryId);
  const customerId = await resolveCustomerId(inquiry);
  const quoteNumber = generateQuoteNumber();
  const buffer = await renderQuotePdf({
    quoteNumber,
    customerName: inquiry.name,
    customerEmail: inquiry.email,
    customerPhone: inquiry.phone,
    items: parsed.data.items,
    notes: parsed.data.notes,
  });
  const total = quoteTotal(parsed.data.items);

  const result = await sendEmail({
    to: inquiry.email,
    subject: `Your quote from Flow (${quoteNumber})`,
    html: `
      <p>Hi ${inquiry.name},</p>
      <p>Thanks for your interest — your quote is attached as a PDF.</p>
      ${parsed.data.notes ? `<p>${parsed.data.notes.replace(/\n/g, "<br/>")}</p>` : ""}
      <p>Let us know if you have any questions.</p>
    `,
    attachments: [{ filename: quoteFilename(quoteNumber, inquiry.name), content: buffer }],
  });

  if (result.skipped) {
    throw new Error("Email isn't configured (RESEND_API_KEY / EMAIL_FROM) — can't send the quote.");
  }
  if (!result.skipped && result.error) {
    throw new Error(result.error);
  }

  const supabase = await createClient();
  const { error: quoteError } = await supabase.from("quotes").insert({
    quote_number: quoteNumber,
    inquiry_id: inquiry.id,
    customer_id: customerId,
    items: parsed.data.items,
    notes: parsed.data.notes || null,
    total,
  });
  if (quoteError) throw new Error(quoteError.message);

  // Advance the pipeline stage on send, but never downgrade a deal that's
  // already been won or lost just because a follow-up quote went out.
  if (inquiry.status === "new" || inquiry.status === "contacted") {
    await supabase.from("inquiries").update({ status: "quoted" }).eq("id", inquiry.id);
  }

  await logActivity({
    action: "update",
    entity_type: "inquiry",
    entity_id: inquiry.id,
    entity_name: `Quote sent to ${inquiry.email} (${quoteNumber}, $${total.toFixed(2)})`,
  });

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin");
  return { success: true as const };
}

/** Re-renders a previously sent quote's PDF from its stored line items, for re-downloading from a customer's profile. */
export async function downloadStoredQuotePdf(quoteId: string) {
  const supabase = await createClient();
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
