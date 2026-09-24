import { createClient } from "@/lib/supabase/server";
import { roleCan } from "@/lib/admin-guard";
import { ClearErrorsButton, RetryNotificationsButton } from "@/components/admin/system-health-actions";
import { inquiryReference } from "@/lib/notifications";
import type { AdminRole } from "@/lib/supabase/types";

/**
 * Failed staff-notification emails (with a retry) and recent server errors.
 * Rendered on the dashboard only when there's something to act on — the
 * "needs attention" cards link down to it.
 */
export async function SystemHealth({ role }: { role: AdminRole }) {
  const supabase = await createClient();
  const sales = roleCan(role, "sales");

  const [{ data: failedEmails }, { data: errors }] = await Promise.all([
    sales
      ? supabase
          .from("inquiries")
          .select("id, name, created_at, notify_error")
          .not("notify_error", "is", null)
          .is("notified_at", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as { id: string; name: string; created_at: string; notify_error: string | null }[] }),
    supabase.from("error_events").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  const failed = failedEmails ?? [];
  const errorRows = errors ?? [];
  if (failed.length === 0 && errorRows.length === 0) return null;

  return (
    <section id="system-health" className="mt-8 scroll-mt-20 rounded-xl border border-border p-4">
      <h2 className="font-heading text-lg text-foreground">System health</h2>
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        {sales && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">Failed inquiry emails</h3>
              {failed.length > 0 && <RetryNotificationsButton />}
            </div>
            {failed.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">All staff notifications went out.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {failed.map((f) => (
                  <li key={f.id} className="py-1.5">
                    <span className="text-foreground">{f.name}</span>{" "}
                    <span className="text-muted-foreground">
                      {inquiryReference(f.id)} · {new Date(f.created_at).toLocaleString("en-AU")}
                    </span>
                    <p className="truncate text-xs text-destructive">{f.notify_error}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">Recent server errors</h3>
            {errorRows.length > 0 && roleCan(role, "admins") && <ClearErrorsButton />}
          </div>
          {errorRows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No errors recorded.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {errorRows.map((e) => (
                <li key={e.id} className="py-1.5">
                  <p className="truncate text-foreground" title={e.message}>
                    {e.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.method} {e.path} · {e.route_type} · {new Date(e.created_at).toLocaleString("en-AU")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
