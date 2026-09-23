import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AAL2_COOKIE_NAME, verifyAal2Cookie } from "@/lib/admin-mfa";
import type { AdminRole } from "@/lib/supabase/types";

export class AdminAuthError extends Error {
  constructor(message = "You're not signed in as an admin — sign in again.") {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** What each role may touch. `owner` can do everything, including managing other admins. */
const ROLE_SCOPES: Record<AdminRole, ReadonlySet<AdminScope>> = {
  owner: new Set(["catalog", "sales", "moderation", "admins"]),
  editor: new Set(["catalog", "moderation"]),
  sales: new Set(["sales"]),
};

export type AdminScope = "catalog" | "sales" | "moderation" | "admins";

export function roleCan(role: AdminRole, scope: AdminScope) {
  return ROLE_SCOPES[role]?.has(scope) ?? false;
}

/**
 * The entry point for every admin server action and admin-only route
 * handler. Checks, in order: a signed-in Supabase user, a valid emailed-code
 * (`admin_aal2`) cookie for that user, membership in `admins`, and — when a
 * `scope` is given — that the admin's role covers it.
 *
 * The database enforces the same second factor independently via
 * `is_mfa_admin()` (0030_admin_mfa_enforcement.sql), so this is the
 * friendly-error layer, not the only line of defence.
 */
export async function requireAdmin(scope?: AdminScope) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AdminAuthError();

  const cookieStore = await cookies();
  if (!verifyAal2Cookie(cookieStore.get(AAL2_COOKIE_NAME)?.value, user.id)) {
    throw new AdminAuthError("Enter your sign-in code to continue.");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) throw new AdminAuthError("This account isn't authorized for admin access.");

  const role = (admin.role ?? "owner") as AdminRole;
  if (scope && !roleCan(role, scope)) {
    throw new AdminAuthError("Your admin role doesn't allow this.");
  }

  return { supabase, user, role };
}
