"use server";

import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { escapeHtml, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { emailButton, emailDetails, emailLayout, emailParagraph } from "@/lib/email-layout";

/** Looked up by the unguessable `accept_token` in the emailed link — never by id, so there's nothing to enumerate. */
export async function getPublicQuote(token: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_quote_by_token", { p_token: token });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

/** Records the customer's decision. The `respond_to_quote` RPC only applies it once, from the 'sent' state, so replaying the link after a decision is a no-op. */
export async function respondToQuote(token: string, status: "accepted" | "declined") {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("respond_to_quote", { p_token: token, p_status: status });
  if (error) throw new Error(error.message);
  const applied = Boolean(data);

  // Tell staff straight away — an accepted quote is the moment to act.
  const notifyTo = process.env.INQUIRY_NOTIFICATION_EMAIL;
  if (applied && notifyTo) {
    after(async () => {
      const quote = await getPublicQuote(token);
      if (!quote) return;
      const subject = `Quote ${quote.quote_number} ${status} by ${quote.customer_name}`;
      await sendEmail({
        to: notifyTo,
        subject,
        html: emailLayout({
          title: subject,
          preheader: `${quote.customer_name} has ${status} quote ${quote.quote_number}.`,
          eyebrow: `Quote ${quote.quote_number}`,
          heading: `${quote.customer_name} ${status} their quote`,
          audience: "staff",
          body: [
            emailDetails([
              ["Customer", escapeHtml(quote.customer_name)],
              ["Email", `<a href="mailto:${escapeHtml(quote.customer_email)}" style="color:#111111;">${escapeHtml(quote.customer_email)}</a>`],
              ["Quote", escapeHtml(quote.quote_number)],
              ["Decision", status === "accepted" ? "Accepted" : "Declined"],
            ]),
            status === "accepted"
              ? emailParagraph("Next step: turn it into an order while it's fresh.") +
                emailButton(`${SITE_URL}/admin/quotes`, "Create the order")
              : emailParagraph("Worth a quick call to find out why — a revised quote might still win it.") +
                emailButton(`${SITE_URL}/admin/quotes`, "Open quotes", "secondary"),
          ].join(""),
        }),
      });
    });
  }
  return { applied };
}
