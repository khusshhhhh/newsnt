"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { revalidateCatalog } from "./_shared";
import type { ModerationStatus } from "@/lib/supabase/types";

const STATUSES: ModerationStatus[] = ["pending", "approved", "rejected"];

export async function moderateReview(id: string, status: ModerationStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const { supabase } = await requireAdmin("moderation");
  const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath("/admin/reviews");
}

export async function deleteReview(id: string) {
  const { supabase } = await requireAdmin("moderation");
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath("/admin/reviews");
}

export async function moderateProjectPhoto(id: string, status: ModerationStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const { supabase } = await requireAdmin("moderation");
  const { error } = await supabase.from("project_photos").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath("/admin/photos");
}

export async function deleteProjectPhoto(id: string) {
  const { supabase } = await requireAdmin("moderation");
  const { data: photo } = await supabase
    .from("project_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("project_photos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (photo?.storage_path) {
    await supabase.storage.from("media").remove([photo.storage_path]);
  }

  revalidateCatalog();
  revalidatePath("/admin/photos");
}

/** Approve or reject many reviews/photos at once — the "all on this page" buttons. */
export async function bulkModerate(kind: "review" | "project_photo", ids: string[], status: ModerationStatus) {
  if (ids.length === 0) return;
  if (status === "pending" || !STATUSES.includes(status)) throw new Error("Invalid status");
  const { supabase } = await requireAdmin("moderation");
  const table = kind === "review" ? "reviews" : "project_photos";
  const { error } = await supabase.from(table).update({ status }).in("id", ids);
  if (error) throw new Error(error.message);

  revalidateCatalog();
  revalidatePath(kind === "review" ? "/admin/reviews" : "/admin/photos");
  revalidatePath("/admin");
}
