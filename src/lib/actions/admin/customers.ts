"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";

export async function addCustomerNote(customerId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note can't be empty");

  const { supabase } = await requireAdmin("sales");
  const { data, error } = await supabase
    .from("customer_notes")
    .insert({ customer_id: customerId, body: trimmed })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/customers/${customerId}`);
  return data;
}

export async function deleteCustomerNote(noteId: string, customerId: string) {
  const { supabase } = await requireAdmin("sales");
  const { error } = await supabase.from("customer_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/customers/${customerId}`);
}

function revalidateCustomers(id: string) {
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/trash");
  revalidatePath("/admin");
}

/** Hides a customer from the CRM lists; restorable from /admin/trash. Their inquiries, quotes and orders are untouched. */
export async function trashCustomer(id: string) {
  const { supabase } = await requireAdmin("sales");
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidateCustomers(id);
}

export async function restoreCustomer(id: string) {
  const { supabase } = await requireAdmin("sales");
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidateCustomers(id);
}
