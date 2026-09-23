"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { looksLikeBot, withinRateLimit } from "@/lib/rate-limit";
import { DEPARTMENTS } from "@/lib/department";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  department: z.enum(DEPARTMENTS).optional(),
});

export type NewsletterState = { error?: string; success?: boolean };

export async function subscribeNewsletter(
  _prevState: NewsletterState | null,
  formData: FormData
): Promise<NewsletterState> {
  if (!(await withinRateLimit("newsletter"))) {
    return { error: "Too many signups from this network — please try again later." };
  }
  if (looksLikeBot(formData)) return { success: true };

  const parsed = schema.safeParse({
    email: formData.get("email"),
    department: formData.get("department") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const supabase = createPublicClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({
    email: parsed.data.email,
    department: parsed.data.department ?? null,
  });

  // 23505 = unique_violation — already on the list, treat it as success.
  if (error && error.code !== "23505") {
    return { error: "Something went wrong — try again." };
  }

  return { success: true };
}
