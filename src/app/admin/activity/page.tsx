import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, roleCan } from "@/lib/admin-guard";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { ClearErrorsButton, RetryNotificationsButton } from "@/components/admin/system-health-actions";
import { buildHref, pageCount, pageRange, parsePage } from "@/lib/admin-list";
import { inquiryReference } from "@/lib/notifications";
import type { ActivityEntityType } from "@/lib/supabase/types";

export const metadata = { title: "Activity" };

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  restore: "Restored",
};

const ENTITY_TYPES: ActivityEntityType[] = [
  "product",
  "series",
  "category",
  "finish",
  "inquiry",
  "customer",
  "customer_note",
  "quote",
  "order",
  "review",
  "project_photo",
  "admin",
];

const RESTORABLE = new Set(["product", "series", "customer"]);
const PAGE_SIZE = 50;

function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; actor?: string; from?: string; to?: string; page?: string }>;
}) {
  const { role } = await requireAdmin();
  const { type: rawType, actor, from, to, page: rawPage } = await searchParams;
  const type = rawType && (ENTITY_TYPES as string[]).includes(rawType) ? (rawType as ActivityEntityType) : undefined;
  const page = parsePage(rawPage);
  const current = { type, actor, from, to };
  const supabase = await createClient();

  let query = supabase.from("activity_log").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (type) query = query.eq("entity_type", type);
  if (actor) query = query.eq("actor_email", actor);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("created_at", `${to}T23:59:59`);
  const [start, end] = pageRange(page, PAGE_SIZE);

  const sales = roleCan(role, "sales");
  const [{ data: entries, count }, { data: actors }, { data: failedEmails }, { data: errors }] = await Promise.all([
    query.range(start, end),
    supabase
      .from("activity_log")
      .select("actor_email")
      .not("actor_email", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
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
  const actorOptions = Array.from(new Set((actors ?? []).map((a) => a.actor_email as string)));
  const failed = failedEmails ?? [];
  const errorRows = errors ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every change made from the admin panel, and the site&apos;s health.</p>

      <section id="system-health" className="mt-6 scroll-mt-20 rounded-xl border border-border p-4">
        <h2 className="font-heading text-lg text-foreground">System health</h2>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
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

      <form className="mt-8 flex flex-wrap items-end gap-3" action="/admin/activity">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Type
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Who
          <select
            name="actor"
            defaultValue={actor ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          >
            <option value="">Anyone</option>
            {actorOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          />
        </label>
        <button type="submit" className="h-8 rounded-md bg-foreground px-3 text-sm text-background">
          Filter
        </button>
        {(type || actor || from || to) && (
          <Link href="/admin/activity" className="h-8 px-2 text-sm leading-8 text-muted-foreground hover:text-foreground">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 divide-y divide-border rounded-xl border border-border">
        {entries?.map((entry) => {
          const changes = entry.changes ? Object.entries(entry.changes) : [];
          return (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Badge variant={entry.action === "delete" ? "destructive" : "secondary"}>
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </Badge>
                  <span className="truncate text-sm text-foreground">
                    {entry.entity_type.replace(/_/g, " ")}
                    {entry.entity_name ? ` — ${entry.entity_name}` : ""}
                  </span>
                  {entry.action === "delete" &&
                    RESTORABLE.has(entry.entity_type) &&
                    !entry.entity_name?.includes("(permanently)") && (
                      <Link
                        href="/admin/trash"
                        className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        Restore in Trash
                      </Link>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span>{entry.actor_email ?? "Unknown"}</span>
                  <span>{new Date(entry.created_at).toLocaleString("en-AU")}</span>
                </div>
              </div>
              {changes.length > 0 && (
                <dl className="mt-2 grid gap-1 rounded-md bg-muted/40 p-2 text-xs sm:grid-cols-2">
                  {changes.map(([field, change]) => (
                    <div key={field} className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-muted-foreground">{field.replace(/_/g, " ")}:</dt>
                      <dd className="min-w-0 truncate">
                        <span className="text-muted-foreground line-through">{formatValue(change.from)}</span>{" "}
                        <span className="text-foreground">→ {formatValue(change.to)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}

        {(!entries || entries.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No activity matches.</p>
        )}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount(count, PAGE_SIZE)}
        buildHref={(p) => buildHref("/admin/activity", current, { page: p > 1 ? String(p) : undefined })}
      />
    </div>
  );
}
