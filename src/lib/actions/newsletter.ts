"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
  const parsed = schema.safeParse({
    email: formData.get("email"),
    department: formData.get("department") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const supabase = await createClient();
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
