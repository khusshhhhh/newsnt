"use server";

import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { escapeHtml, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

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
      await sendEmail({
        to: notifyTo,
        subject: `Quote ${quote.quote_number} ${status} by ${quote.customer_name}`,
        html: `
          <p><strong>${escapeHtml(quote.customer_name)}</strong> (${escapeHtml(quote.customer_email)}) has <strong>${status}</strong> quote ${escapeHtml(quote.quote_number)}.</p>
          ${status === "accepted" ? `<p>Next step: <a href="${SITE_URL}/admin/quotes">turn it into an order</a>.</p>` : ""}
        `,
      });
    });
  }
  return { applied };
}
