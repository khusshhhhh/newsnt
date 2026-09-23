"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-guard";
import { retryFailedInquiryNotifications } from "@/lib/ops";
import type { Database } from "@/lib/supabase/types";

/** The "Retry" button in System health — re-sends failed inquiry notification emails under the admin's own session. */
export async function retryInquiryNotifications() {
  const { supabase } = await requireAdmin("sales");
  const result = await retryFailedInquiryNotifications(supabase as unknown as SupabaseClient<Database>);
  revalidatePath("/admin/activity");
  revalidatePath("/admin");
  return result;
}

export async function clearErrorEvents() {
  const { supabase } = await requireAdmin("admins");
  const { error } = await supabase.from("error_events").delete().lt("created_at", new Date().toISOString());
  if (error) throw new Error(error.message);
  revalidatePath("/admin/activity");
  revalidatePath("/admin");
}
