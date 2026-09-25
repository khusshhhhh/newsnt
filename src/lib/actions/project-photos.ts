"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { looksLikeBot, withinRateLimit } from "@/lib/rate-limit";
import { DEPARTMENTS } from "@/lib/department";

const schema = z.object({
  department: z.enum(DEPARTMENTS),
  series_id: z.string().uuid().optional(),
  storage_path: z
    .string()
    .trim()
    .min(1, "Upload a photo")
    // Only paths inside the anon upload prefix (0021) — never point a
    // submission at an admin-managed product photo.
    .regex(/^project-submissions\/[\w.-]+$/, "Upload a photo"),
  caption: z.string().trim().max(500).optional(),
  submitter_name: z.string().trim().min(1, "Enter your name").max(120),
  submitter_email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
});

export type ProjectPhotoState = { error?: string; success?: boolean };

export async function submitProjectPhoto(
  _prevState: ProjectPhotoState | null,
  formData: FormData
): Promise<ProjectPhotoState> {
  if (!(await withinRateLimit("projectPhoto"))) {
    return { error: "Too many submissions from this network — please try again later." };
  }
  if (looksLikeBot(formData)) return { success: true };

  const seriesIdRaw = String(formData.get("series_id") ?? "");
  const parsed = schema.safeParse({
    department: formData.get("department"),
    series_id: seriesIdRaw || undefined,
    storage_path: formData.get("storage_path"),
    caption: formData.get("caption") || undefined,
    submitter_name: formData.get("submitter_name"),
    submitter_email: formData.get("submitter_email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = createPublicClient();
  const { error } = await supabase.from("project_photos").insert({
    department: parsed.data.department,
    series_id: parsed.data.series_id ?? null,
    storage_path: parsed.data.storage_path,
    caption: parsed.data.caption ?? null,
    submitter_name: parsed.data.submitter_name,
    submitter_email: parsed.data.submitter_email,
    status: "pending",
  });

  if (error) {
    return { error: "Something went wrong — try again." };
  }

  return { success: true };
}
