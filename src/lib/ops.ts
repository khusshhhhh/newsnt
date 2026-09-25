import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { escapeHtml, sendEmail } from "@/lib/email";
import { sendStaffInquiryNotification, inquiryReference } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";
import { emailButton, emailDetails, emailHeading, emailLayout, emailList, emailParagraph } from "@/lib/email-layout";
import type { InquiryItem } from "@/lib/supabase/types";

type ServiceClient = SupabaseClient<Database>;

/**
 * Re-sends staff notifications for inquiries whose email failed. Takes the
 * client to use, so the admin "Retry" button can run it under the admin's
 * own session (RLS-checked) and the daily cron under the service role.
 */
export async function retryFailedInquiryNotifications(supabase: ServiceClient, limit = 25) {
  const { data: failed } = await supabase
    .from("inquiries")
    .select("id, department, name, email, phone, message, items, product_ids")
    .not("notify_error", "is", null)
    .is("notified_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  let sent = 0;
  let stillFailing = 0;
  for (const inquiry of failed ?? []) {
    const error = await sendStaffInquiryNotification({
      ...inquiry,
      items: inquiry.items as InquiryItem[] | null,
    }).catch((e: unknown) => (e instanceof Error ? e.message : "Unknown error"));
    if (error) {
      stillFailing += 1;
      await supabase.from("inquiries").update({ notify_error: error }).eq("id", inquiry.id);
    } else {
      sent += 1;
      await supabase
        .from("inquiries")
        .update({ notify_error: null, notified_at: new Date().toISOString() })
        .eq("id", inquiry.id);
    }
  }
  return { sent, stillFailing };
}

/** Everything that needs a human, as of now — for the daily digest email. */
async function digestContent(supabase: ServiceClient) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const followUpBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [inquiries, reviews, photos, quotes, errors] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, name, department, created_at")
      .eq("status", "new")
      .is("deleted_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("project_photos").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("quotes")
      .select("quote_number, sent_at, customer:customers(name)")
      .eq("status", "sent")
      .lt("sent_at", followUpBefore)
      .is("reminder_sent_at", null)
      .gt("expires_at", now)
      .order("sent_at"),
    supabase.from("error_events").select("*", { count: "exact", head: true }).gte("created_at", since),
  ]);

  return {
    newInquiries: inquiries.data ?? [],
    pendingReviews: reviews.count ?? 0,
    pendingPhotos: photos.count ?? 0,
    quotesToFollowUp: (quotes.data ?? []) as unknown as {
      quote_number: string;
      sent_at: string;
      customer: { name: string } | null;
    }[],
    errors: errors.count ?? 0,
  };
}

export async function sendDailyDigest(supabase: ServiceClient) {
  const to = process.env.ADMIN_DIGEST_EMAIL || process.env.INQUIRY_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "No ADMIN_DIGEST_EMAIL / INQUIRY_NOTIFICATION_EMAIL set" };

  const d = await digestContent(supabase);
  const nothingToReport =
    d.newInquiries.length === 0 && d.pendingReviews === 0 && d.pendingPhotos === 0 && d.quotesToFollowUp.length === 0 && d.errors === 0;
  if (nothingToReport) return { sent: false, reason: "Nothing to report" };

  const total = d.newInquiries.length + d.quotesToFollowUp.length + d.pendingReviews + d.pendingPhotos;
  const body = [
    emailParagraph("Here's what needs attention in the Flow admin panel today."),
    emailDetails([
      ["New inquiries (24h)", String(d.newInquiries.length)],
      ["Quotes waiting over a week", String(d.quotesToFollowUp.length)],
      ["To moderate", `${d.pendingReviews} review${d.pendingReviews === 1 ? "" : "s"}, ${d.pendingPhotos} photo${d.pendingPhotos === 1 ? "" : "s"}`],
      ["Server errors (24h)", String(d.errors)],
    ]),
    d.newInquiries.length > 0
      ? emailHeading(`${d.newInquiries.length} new inquir${d.newInquiries.length === 1 ? "y" : "ies"}`) +
        emailList(d.newInquiries.map((i) => `${escapeHtml(i.name)} <span style="color:#6b6b6b;">— ${inquiryReference(i.id)}</span>`))
      : "",
    d.quotesToFollowUp.length > 0
      ? emailHeading(`${d.quotesToFollowUp.length} quote${d.quotesToFollowUp.length === 1 ? "" : "s"} to follow up`) +
        emailList(
          d.quotesToFollowUp.map(
            (q) =>
              `${escapeHtml(q.quote_number)} — ${escapeHtml(q.customer?.name ?? "Unknown")} <span style="color:#6b6b6b;">sent ${new Date(q.sent_at).toLocaleDateString("en-AU")}</span>`
          )
        )
      : "",
    d.errors > 0
      ? emailHeading("Server errors") +
        emailParagraph(`${d.errors} in the last 24 hours — see System health on the admin dashboard.`)
      : "",
    emailButton(`${SITE_URL}/admin`, "Open the admin panel"),
  ].join("");

  const subject = "Flow admin — daily summary";
  const html = emailLayout({
    title: subject,
    preheader:
      total > 0
        ? `${total} item${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} attention today.`
        : `${d.errors} server error${d.errors === 1 ? "" : "s"} in the last 24 hours.`,
    eyebrow: new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }),
    heading: "Your daily summary",
    audience: "staff",
    body,
  });

  const result = await sendEmail({ to, subject, html });
  return { sent: !result.skipped && !result.error, reason: result.error };
}

/** Deletes rows nothing needs any more. */
export async function pruneOldRows(supabase: ServiceClient) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await Promise.all([
    supabase.rpc("prune_admin_mfa_sessions"),
    supabase.from("error_events").delete().lt("created_at", ninetyDaysAgo),
  ]);
}
