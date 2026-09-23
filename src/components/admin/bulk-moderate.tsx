"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkModerate } from "@/lib/actions/admin/moderation";
import { Button } from "@/components/ui/button";

/** "Approve all / Reject all" for the pending items shown on the current page. */
export function BulkModerate({ kind, ids }: { kind: "review" | "project_photo"; ids: string[] }) {
  const [pending, startTransition] = useTransition();
  const noun = kind === "review" ? "review" : "photo";

  function run(status: "approved" | "rejected") {
    const verb = status === "approved" ? "Approve" : "Reject";
    if (!window.confirm(`${verb} all ${ids.length} ${noun}${ids.length === 1 ? "" : "s"} on this page?`)) return;
    startTransition(async () => {
      try {
        await bulkModerate(kind, ids, status);
        toast.success(`${ids.length} ${noun}${ids.length === 1 ? "" : "s"} ${status}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bulk moderation failed");
      }
    });
  }

  if (ids.length < 2) return null;
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run("approved")}>
        Approve all {ids.length}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run("rejected")}>
        Reject all
      </Button>
    </div>
  );
}
