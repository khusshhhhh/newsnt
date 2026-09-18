"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { fail, ok, revalidateCatalog } from "./_shared";

const finishSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Code is required")
    .max(4, "Keep the code to 4 characters or fewer"),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a hex color like #1C1C1C"),
  display_order: z.coerce.number().int().default(0),
  is_active: z.coerce.boolean().default(true),
});

export async function upsertFinish(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const parsed = finishSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    hex: formData.get("hex"),
    display_order: formData.get("display_order") ?? 0,
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: finish, error } = id
    ? await supabase.from("finishes").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("finishes").insert(parsed.data).select("id").single();

  if (error) {
    return fail(
      error.code === "23505" ? "A finish with that name or code already exists." : error.message
    );
  }

  await logActivity({
    action: id ? "update" : "create",
    entity_type: "finish",
    entity_id: finish.id,
    entity_name: parsed.data.name,
  });
  revalidateCatalog();
  revalidatePath("/admin/finishes");
  revalidatePath("/", "layout");
  return ok(finish.id);
}

export async function deleteFinish(id: string) {
  const supabase = await createClient();
  const { data: finish } = await supabase.from("finishes").select("name").eq("id", id).maybeSingle();

  const { error } = await supabase.from("finishes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({ action: "delete", entity_type: "finish", entity_id: id, entity_name: finish?.name });
  revalidateCatalog();
  revalidatePath("/admin/finishes");
  revalidatePath("/", "layout");
}
