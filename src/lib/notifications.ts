import { escapeHtml, escapeHtmlMultiline, sendEmail } from "@/lib/email";
import { createPublicClient } from "@/lib/supabase/public";
import { departmentCopy, isDepartment } from "@/lib/department";
import { SITE_URL } from "@/lib/site";
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

async function productNames(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await createPublicClient().from("products").select("id, name, sku").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.sku ? `${p.name} (${p.sku})` : p.name]));
}

async function itemsHtml(inquiry: InquiryForNotification) {
  const counts = inquiryLineCounts(inquiry);
  if (counts.size === 0) return "";
  const names = await productNames([...counts.keys()]);
  const rows = [...counts.entries()]
    .map(([id, qty]) => `<li>${qty} × ${escapeHtml(names.get(id) ?? "Unlisted product")}</li>`)
    .join("");
  return `<p><strong>Products:</strong></p><ul>${rows}</ul>`;
}

/**
 * Emails staff about a new inquiry. Returns an error string when it didn't
 * go out (or email isn't configured), so the caller can record it for the
 * retry button in /admin/activity.
 */
export async function sendStaffInquiryNotification(inquiry: InquiryForNotification): Promise<string | null> {
  const notifyTo = process.env.INQUIRY_NOTIFICATION_EMAIL;
  if (!notifyTo) return null;

  const department = isDepartment(inquiry.department) ? departmentCopy(inquiry.department).label : inquiry.department;
  const result = await sendEmail({
    to: notifyTo,
    subject: `New inquiry ${inquiryReference(inquiry.id)} — ${inquiry.name}`,
    html: `
      <p><strong>Department:</strong> ${escapeHtml(department)}</p>
      <p><strong>From:</strong> ${escapeHtml(inquiry.name)} (${escapeHtml(inquiry.email)}${inquiry.phone ? `, ${escapeHtml(inquiry.phone)}` : ""})</p>
      ${await itemsHtml(inquiry)}
      <p><strong>Message:</strong></p>
      <p>${escapeHtmlMultiline(inquiry.message)}</p>
      <p><a href="${SITE_URL}/admin/inquiries">Open in the admin panel</a></p>
    `,
  });
  if (result.skipped) return "Email isn't configured (RESEND_API_KEY / EMAIL_FROM).";
  return result.error ?? null;
}

/** "We've got your request" receipt for the customer. Returns true when sent. */
export async function sendCustomerInquiryReceipt(inquiry: InquiryForNotification): Promise<boolean> {
  const department = isDepartment(inquiry.department) ? departmentCopy(inquiry.department).label : "Flow";
  const result = await sendEmail({
    to: inquiry.email,
    subject: `We've received your request ${inquiryReference(inquiry.id)}`,
    html: `
      <p>Hi ${escapeHtml(inquiry.name)},</p>
      <p>Thanks for getting in touch with Flow ${escapeHtml(department)}. We've received your request and a member of the team will get back to you soon.</p>
      ${await itemsHtml(inquiry)}
      <p><strong>Your message:</strong></p>
      <p>${escapeHtmlMultiline(inquiry.message)}</p>
      <p>Your reference is <strong>${inquiryReference(inquiry.id)}</strong> — mention it if you reply to this email.</p>
    `,
  });
  return !result.skipped && !result.error;
}
