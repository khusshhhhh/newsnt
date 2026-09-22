"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { isEligibleForPermanentDelete, daysUntilEligible } from "@/lib/trash";
import type { InquiryStatus } from "@/lib/supabase/types";

const STATUSES: InquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];

function revalidateInquiries(customerId?: string | null) {
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  if (customerId) revalidatePath(`/admin/customers/${customerId}`);
}

export async function markInquiryStatus(id: string, status: InquiryStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({ action: "update", entity_type: "inquiry", entity_id: id, entity_name: status });
  revalidateInquiries();
}

/** Moves an inquiry to trash — reversible, and never removes the row itself. */
export async function trashInquiry(id: string) {
  const supabase = await createClient();
  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("name, customer_id")
    .single();
  if (error) throw new Error(error.message);

  await logActivity({
    action: "delete",
    entity_type: "inquiry",
    entity_id: id,
    entity_name: inquiry?.name,
  });
  revalidateInquiries(inquiry?.customer_id);
}

export async function restoreInquiry(id: string) {
  const supabase = await createClient();
  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("name, customer_id")
    .single();
  if (error) throw new Error(error.message);

  await logActivity({
    action: "update",
    entity_type: "inquiry",
    entity_id: id,
    entity_name: `${inquiry?.name ?? "Inquiry"} restored from trash`,
  });
  revalidateInquiries(inquiry?.customer_id);
}

/** Only allowed once an inquiry has sat in trash for TRASH_RETENTION_DAYS — re-checked here since the client-side gate is just UX, not the actual guard. */
export async function permanentlyDeleteInquiry(id: string) {
  const supabase = await createClient();
  const { data: inquiry, error: fetchError } = await supabase
    .from("inquiries")
    .select("name, deleted_at, customer_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!inquiry) throw new Error("Inquiry not found");
  if (!inquiry.deleted_at) throw new Error("Inquiry isn't in trash");
  if (!isEligibleForPermanentDelete(inquiry.deleted_at)) {
    const days = daysUntilEligible(inquiry.deleted_at);
    throw new Error(`Can't permanently delete yet — available in ${days} day${days === 1 ? "" : "s"}.`);
  }

  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({
    action: "delete",
    entity_type: "inquiry",
    entity_id: id,
    entity_name: `${inquiry.name} (permanently)`,
  });
  revalidateInquiries(inquiry.customer_id);
}
