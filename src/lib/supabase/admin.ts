import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client that bypasses RLS entirely — for admin-user management
 * (listing/inviting/removing Supabase Auth users) only, since that needs the
 * `auth.admin` API the anon/session clients can't reach. Never import this
 * from a client component or anything that runs in the browser: the
 * `SUPABASE_SERVICE_ROLE_KEY` env var it reads has no `NEXT_PUBLIC_` prefix
 * specifically so Next.js won't inline it into a client bundle, but a stray
 * import would still leak it into that route's server bundle unnecessarily.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
