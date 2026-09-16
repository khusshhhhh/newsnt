import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Stateless anon client for public catalog reads — no cookies/session, since
 * RLS already scopes these queries to published rows for the `anon` role.
 * Deliberately doesn't call `cookies()`, so it's safe to use inside
 * `unstable_cache`, which forbids request-scoped APIs.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
