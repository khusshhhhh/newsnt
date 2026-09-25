import { escapeHtml, escapeHtmlMultiline, sendEmail } from "@/lib/email";
import { createPublicClient } from "@/lib/supabase/public";
import { departmentCopy, isDepartment, seriesIndexHref } from "@/lib/department";
import { SITE_URL } from "@/lib/site";
import {
  customerSignOff,
  emailButton,
  emailDetails,
  emailItems,
  emailLayout,
  emailParagraph,
  emailQuote,
  emailSteps,
  siteLink,
} from "@/lib/email-layout";
import type { InquiryItem } from "@/lib/supabase/types";

export type InquiryForNotification = {
  id: string;
  department: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  items: InquiryItem[] | null;
  product_ids: string[] | null;
};

/** Short, human-friendly reference shown to the customer and in the admin panel. */
export function inquiryReference(id: string) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : "";
}

/** Normalizes the structured `items` (quote basket) and the older repeated `product_ids` into product → quantity lines. */
export function inquiryLineCounts(inquiry: Pick<InquiryForNotification, "items" | "product_ids">) {
  const counts = new Map<string, number>();
  if (inquiry.items && inquiry.items.length > 0) {
    for (const item of inquiry.items) counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + item.quantity);
  } else {
    for (const id of inquiry.product_ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function products(ids: string[]) {
  if (ids.length === 0) return new Map<string, { name: string; sku: string | null }>();
  const { data } = await createPublicClient().from("products").select("id, name, sku").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, { name: p.name, sku: p.sku }]));
}

async function itemsHtml(inquiry: InquiryForNotification) {
  const counts = inquiryLineCounts(inquiry);
  if (counts.size === 0) return "";
  const found = await products([...counts.keys()]);
  return emailItems(
    [...counts.entries()].map(([id, quantity]) => {
      const product = found.get(id);
      return {
        nameHtml: escapeHtml(product?.name ?? "Unlisted product"),
        metaHtml: product?.sku ? `SKU ${escapeHtml(product.sku)}` : undefined,
        quantity,
      };
    })
  );
}

/**
 * Emails staff about a new inquiry. Returns an error string when it didn't
 * go out (or email isn't configured), so the caller can record it for the
 * retry button in System health on the admin dashboard.
 */
export async function sendStaffInquiryNotification(inquiry: InquiryForNotification): Promise<string | null> {
  const notifyTo = process.env.INQUIRY_NOTIFICATION_EMAIL;
  if (!notifyTo) return null;

  const department = isDepartment(inquiry.department) ? departmentCopy(inquiry.department).label : inquiry.department;
  const subject = `New inquiry ${inquiryReference(inquiry.id)} — ${inquiry.name}`;
  const result = await sendEmail({
    to: notifyTo,
    subject,
    html: emailLayout({
      title: subject,
      preheader: `${inquiry.name} sent a ${department} inquiry.`,
      eyebrow: `New inquiry ${inquiryReference(inquiry.id)}`,
      heading: `${inquiry.name} wants a quote`,
      audience: "staff",
      body: [
        emailDetails([
          ["Department", escapeHtml(department)],
          ["Name", escapeHtml(inquiry.name)],
          ["Email", `<a href="mailto:${escapeHtml(inquiry.email)}" style="color:#111111;">${escapeHtml(inquiry.email)}</a>`],
          ...(inquiry.phone
            ? ([["Phone", `<a href="tel:${escapeHtml(inquiry.phone.replace(/[^\d+]/g, ""))}" style="color:#111111;">${escapeHtml(inquiry.phone)}</a>`]] as [string, string][])
            : []),
          ["Reference", inquiryReference(inquiry.id)],
        ]),
        await itemsHtml(inquiry),
        inquiry.message ? emailQuote(escapeHtmlMultiline(inquiry.message), "Message") : "",
        emailButton(`${SITE_URL}/admin/inquiries`, "Open in the admin panel"),
      ].join(""),
    }),
  });
  if (result.skipped) return "Email isn't configured (RESEND_API_KEY / EMAIL_FROM).";
  return result.error ?? null;
}

/** "We've got your request" receipt for the customer. Returns true when sent. */
export async function sendCustomerInquiryReceipt(inquiry: InquiryForNotification): Promise<boolean> {
  const department = isDepartment(inquiry.department) ? inquiry.department : undefined;
  const label = department ? `Flow ${departmentCopy(department).label}` : "Flow";
  const reference = inquiryReference(inquiry.id);
  const subject = `We've received your request ${reference}`;
  const result = await sendEmail({
    to: inquiry.email,
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Thanks for getting in touch with ${label} — your reference is ${reference}.`,
      eyebrow: `Request ${reference}`,
      heading: "Thanks — we've got your request",
      audience: "customer",
      department,
      body: [
        emailParagraph(`Hi ${escapeHtml(inquiry.name)},`),
        emailParagraph(
          `Thanks for getting in touch with ${escapeHtml(label)}. We've received your request and a member of the team will get back to you soon.`
        ),
        emailDetails([
          ["Reference", `<strong>${reference}</strong>`],
          ["Department", escapeHtml(department ? departmentCopy(department).label : inquiry.department)],
        ]),
        await itemsHtml(inquiry),
        inquiry.message ? emailQuote(escapeHtmlMultiline(inquiry.message), "Your message") : "",
        emailSteps([
          ["We review your request", "Someone from our team checks the products, finishes and quantities you asked about."],
          ["We send your quote", "You'll get a detailed quote by email, with a PDF you can share with your builder or designer."],
          ["Accept online", "Happy with it? Accept in a couple of clicks and we'll confirm lead times and delivery."],
        ]),
        department ? emailButton(siteLink(seriesIndexHref(department)), "Keep exploring the range", "secondary") : "",
        emailParagraph(`Mention <strong>${reference}</strong> if you reply to this email — it helps us find your request quickly.`),
        customerSignOff(),
      ].join(""),
    }),
  });
  return !result.skipped && !result.error;
}
