"use server";

import { createPublicClient } from "@/lib/supabase/public";

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
  return { applied: Boolean(data) };
}
