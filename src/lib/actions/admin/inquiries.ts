"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { InquiryStatus } from "@/lib/supabase/types";

const STATUSES: InquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];

export async function markInquiryStatus(id: string, status: InquiryStatus) {
  if (!STATUSES.includes(status)) throw new Error("Invalid status");

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({ action: "update", entity_type: "inquiry", entity_id: id, entity_name: status });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
}
