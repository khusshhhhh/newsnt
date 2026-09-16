import { getRecentActivity } from "@/lib/data/activity";
import { Badge } from "@/components/ui/badge";

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

export default async function AdminActivityPage() {
  const entries = await getRecentActivity(100);

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Recent catalog changes made from the admin panel.
      </p>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {entries?.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{ACTION_LABEL[entry.action] ?? entry.action}</Badge>
              <span className="text-sm text-foreground">
                {entry.entity_type}
                {entry.entity_name ? ` — ${entry.entity_name}` : ""}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              <span>{entry.actor_email ?? "Unknown"}</span>
              <span>{new Date(entry.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}

        {(!entries || entries.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
