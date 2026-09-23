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
  /** Field-level before/after, e.g. from `diffFields()` — shown in the activity log. */
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_log").insert({
      actor_email: user?.email ?? null,
      actor_id: user?.id ?? null,
      changes: entry.changes && Object.keys(entry.changes).length > 0 ? entry.changes : null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      entity_name: entry.entity_name ?? null,
    });
  } catch (err) {
    console.error("Failed to write activity log entry", err);
  }
}

/**
 * The fields that differ between a row before and after an update, limited
 * to `keys` — the shape `logActivity({ changes })` stores.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: Partial<T> | null | undefined,
  after: Partial<T>,
  keys: (keyof T)[]
) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (!before) return changes;
  for (const key of keys) {
    const from = before[key] ?? null;
    const to = after[key] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[String(key)] = { from, to };
  }
  return changes;
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
