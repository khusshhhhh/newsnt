"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";

export async function addCustomerNote(customerId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note can't be empty");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_notes")
    .insert({ customer_id: customerId, body: trimmed })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logActivity({ action: "create", entity_type: "customer_note", entity_id: customerId });
  revalidatePath(`/admin/customers/${customerId}`);
  return data;
}

export async function deleteCustomerNote(noteId: string, customerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customer_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/customers/${customerId}`);
}
