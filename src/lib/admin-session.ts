import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user for this request, fetched once. The admin layout, the
 * page and requireAdmin() all need it; without the per-request cache() each
 * one made its own round-trip to Supabase Auth.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** The `admins` row for a user, fetched once per request. */
export const getAdminRow = cache(async (userId: string) => {
  const { supabase } = await getSessionUser();
  const { data } = await supabase.from("admins").select("role").eq("user_id", userId).maybeSingle();
  return data;
});
