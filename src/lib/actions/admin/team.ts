"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordSetupEmail } from "@/lib/password-setup";
import type { AdminRole } from "@/lib/supabase/types";

const ROLES: AdminRole[] = ["owner", "editor", "sales"];

export type TeamMember = {
  userId: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  lastSignInAt: string | null;
};

/** Every admin with their email — which lives in auth.users, so this needs the service role. */
export async function listTeam(): Promise<TeamMember[]> {
  await requireAdmin("admins");
  const service = createAdminClient();
  const { data: admins, error } = await service
    .from("admins")
    .select("user_id, role, created_at, last_sign_in_at")
    .order("created_at");
  if (error) throw new Error(error.message);

  const members = await Promise.all(
    (admins ?? []).map(async (a) => {
      const { data } = await service.auth.admin.getUserById(a.user_id);
      return {
        userId: a.user_id,
        email: data.user?.email ?? "(unknown)",
        role: a.role,
        createdAt: a.created_at,
        lastSignInAt: a.last_sign_in_at,
      };
    })
  );
  return members;
}

async function ownerCount(service: ReturnType<typeof createAdminClient>) {
  const { count } = await service.from("admins").select("*", { count: "exact", head: true }).eq("role", "owner");
  return count ?? 0;
}

async function roleOf(service: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await service.from("admins").select("role").eq("user_id", userId).maybeSingle();
  return data?.role ?? null;
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(ROLES),
});

/**
 * Adds someone to the admin team. Creates their Supabase Auth user if they
 * don't have one yet, and emails a link to set their password
 * (/admin/login/reset). They still need the emailed code at every sign-in.
 */
export async function inviteAdmin(rawInput: { email: string; role: AdminRole }) {
  const parsed = inviteSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid invite");
  const { email, role } = parsed.data;

  await requireAdmin("admins");
  const service = createAdminClient();

  let userId: string | null = null;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    // Already has an auth account — find it.
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data } = await service.auth.admin.listUsers({ page, perPage: 200 });
      const match = data.users.find((u) => u.email?.toLowerCase() === email);
      if (match) userId = match.id;
      if (data.users.length < 200) break;
    }
    if (!userId) throw new Error(createError?.message ?? "Couldn't create this user.");
  }

  // Re-inviting an existing owner would overwrite their role — same rule as changeAdminRole.
  if ((await roleOf(service, userId)) === "owner" && role !== "owner") {
    throw new Error("That person is already an owner — owners can't change another owner's role.");
  }

  const { error } = await service.from("admins").upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  const emailResult = await sendPasswordSetupEmail(email, "invite");
  revalidatePath("/admin/team");
  return { emailed: emailResult.sent };
}

/** Only owners get here (the "admins" scope). An owner can't change another owner's role. */
export async function changeAdminRole(userId: string, role: AdminRole) {
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  const { user } = await requireAdmin("admins");
  const service = createAdminClient();

  const current = await roleOf(service, userId);
  if (current === "owner" && userId !== user.id) {
    throw new Error("You can't change another owner's role.");
  }
  if (current === "owner" && role !== "owner" && (await ownerCount(service)) <= 1) {
    throw new Error("There must be at least one owner.");
  }

  const { error } = await service.from("admins").update({ role }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
}

/**
 * Removes admin access (the Supabase Auth user itself is kept) and ends their verified sessions.
 * Only owners get here (the "admins" scope), and only editors and sales can be removed — never an owner.
 */
export async function removeAdmin(userId: string) {
  const { user } = await requireAdmin("admins");
  if (userId === user.id) throw new Error("You can't remove yourself.");
  const service = createAdminClient();

  const current = await roleOf(service, userId);
  if (!current) throw new Error("That person isn't on the team.");
  if (current === "owner") throw new Error("Owners can't be removed.");

  const { error } = await service.from("admins").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  await service.from("admin_mfa_sessions").delete().eq("user_id", userId);

  revalidatePath("/admin/team");
}
