"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  product_id: z.string().uuid(),
  reviewer_name: z.string().trim().min(1, "Enter your name"),
  reviewer_email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(1, "Say a little about your experience"),
});

export type ReviewState = { error?: string; success?: boolean };

export async function submitReview(
  _prevState: ReviewState | null,
  formData: FormData
): Promise<ReviewState> {
  const parsed = schema.safeParse({
    product_id: formData.get("product_id"),
    reviewer_name: formData.get("reviewer_name"),
    reviewer_email: formData.get("reviewer_email"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({ ...parsed.data, status: "pending" });

  if (error) {
    return { error: "Something went wrong — try again." };
  }

  return { success: true };
}
