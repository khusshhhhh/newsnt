import { createClient } from "@/lib/supabase/server";
import type { ActivityAction, ActivityEntityType } from "@/lib/supabase/types";

/**
 * Best-effort audit log write — failures here must never block the admin
 * mutation that triggered it, so errors are swallowed rather than thrown.
 */
export async function logActivity(entry: {
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  entity_name?: string | null;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_log").insert({
      actor_email: user?.email ?? null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      entity_name: entry.entity_name ?? null,
    });
  } catch (err) {
    console.error("Failed to write activity log entry", err);
  }
}

export async function getRecentActivity(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
