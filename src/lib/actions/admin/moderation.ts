"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidateCatalog } from "./_shared";
import type { ModerationStatus } from "@/lib/supabase/types";

const STATUSES: ModerationStatus[] = ["pending", "approved", "rejected"];

export async function moderateReview(id: string, status: ModerationStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const { supabase } = await requireAdmin("moderation");
  const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({ action: "update", entity_type: "review", entity_id: id, entity_name: status });
  revalidateCatalog();
  revalidatePath("/admin/reviews");
}

export async function deleteReview(id: string) {
  const { supabase } = await requireAdmin("moderation");
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({ action: "delete", entity_type: "review", entity_id: id });
  revalidateCatalog();
  revalidatePath("/admin/reviews");
}

export async function moderateProjectPhoto(id: string, status: ModerationStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const { supabase } = await requireAdmin("moderation");
  const { error } = await supabase.from("project_photos").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({ action: "update", entity_type: "project_photo", entity_id: id, entity_name: status });
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

  await logActivity({ action: "delete", entity_type: "project_photo", entity_id: id });
  revalidateCatalog();
  revalidatePath("/admin/photos");
}
