"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/data/activity";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";

const lineItemSchema = z.object({
  name: z.string().trim().min(1),
  variantLabel: z.string().trim().nullable(),
  sku: z.string().trim().nullable(),
  seriesName: z.string().trim().nullable(),
  quantity: z.coerce.number().int().positive().max(999),
  unitPrice: z.coerce.number().nonnegative().nullable(),
});

const quoteSchema = z.object({
  inquiryId: z.string().uuid(),
  notes: z.string().trim().max(2000).default(""),
  items: z.array(lineItemSchema).min(1, "Add at least one product to the quote"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

function quoteNumber(inquiryId: string) {
  return `Q-${inquiryId.slice(0, 8).toUpperCase()}`;
}

function quoteFilename(inquiryId: string, customerName: string) {
  const safeName = customerName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "customer";
  return `quote-${quoteNumber(inquiryId).toLowerCase()}-${safeName}.pdf`;
}

async function buildQuotePdf(input: QuoteInput, inquiry: { name: string; email: string; phone: string | null }) {
  const buffer = await renderToBuffer(
    <QuotePdfDocument
      quoteNumber={quoteNumber(input.inquiryId)}
      customerName={inquiry.name}
      customerEmail={inquiry.email}
      customerPhone={inquiry.phone}
      items={input.items}
      notes={input.notes}
    />
  );
  return buffer;
}

async function loadInquiry(inquiryId: string) {
  const supabase = await createClient();
  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select("id, name, email, phone, status")
    .eq("id", inquiryId)
    .single();
  if (error || !inquiry) throw new Error("Inquiry not found");
  return inquiry;
}

/** Renders the quote PDF and hands back base64 bytes for a client-side download — nothing is emailed or persisted. */
export async function previewQuotePdf(rawInput: QuoteInput) {
  const parsed = quoteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote");

  const inquiry = await loadInquiry(parsed.data.inquiryId);
  const buffer = await buildQuotePdf(parsed.data, inquiry);

  return {
    filename: quoteFilename(inquiry.id, inquiry.name),
    base64: buffer.toString("base64"),
  };
}

/** Renders the quote PDF and emails it to the inquiry's own email address as an attachment. */
export async function sendQuotePdf(rawInput: QuoteInput) {
  const parsed = quoteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote");

  const inquiry = await loadInquiry(parsed.data.inquiryId);
  const buffer = await buildQuotePdf(parsed.data, inquiry);
  const total = parsed.data.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);

  const result = await sendEmail({
    to: inquiry.email,
    subject: `Your quote from Flow (${quoteNumber(inquiry.id)})`,
    html: `
      <p>Hi ${inquiry.name},</p>
      <p>Thanks for your interest — your quote is attached as a PDF.</p>
      ${parsed.data.notes ? `<p>${parsed.data.notes.replace(/\n/g, "<br/>")}</p>` : ""}
      <p>Let us know if you have any questions.</p>
    `,
    attachments: [{ filename: quoteFilename(inquiry.id, inquiry.name), content: buffer }],
  });

  if (result.skipped) {
    throw new Error("Email isn't configured (RESEND_API_KEY / EMAIL_FROM) — can't send the quote.");
  }
  if (!result.skipped && result.error) {
    throw new Error(result.error);
  }

  const supabase = await createClient();
  if (inquiry.status === "new") {
    await supabase.from("inquiries").update({ status: "contacted" }).eq("id", inquiry.id);
  }

  await logActivity({
    action: "update",
    entity_type: "inquiry",
    entity_id: inquiry.id,
    entity_name: `Quote sent to ${inquiry.email} (${quoteNumber(inquiry.id)}, $${total.toFixed(2)})`,
  });

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { success: true as const };
}
