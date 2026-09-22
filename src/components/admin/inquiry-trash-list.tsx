"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { restoreInquiry, permanentlyDeleteInquiry } from "@/lib/actions/admin/inquiries";
import { Button } from "@/components/ui/button";
import { departmentCopy } from "@/lib/department";
import { isEligibleForPermanentDelete, daysUntilEligible, TRASH_RETENTION_DAYS } from "@/lib/trash";
import type { Inquiry } from "@/lib/supabase/types";

export function InquiryTrashList({ inquiries }: { inquiries: Inquiry[] }) {
  if (inquiries.length === 0) {
    return <p className="text-sm text-muted-foreground">Trash is empty.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Trashed inquiries can be restored anytime. Permanent deletion unlocks{" "}
        {TRASH_RETENTION_DAYS} days after an inquiry is trashed.
      </p>
      <ul className="flex flex-col gap-3">
        {inquiries.map((inquiry) => (
          <TrashRow key={inquiry.id} inquiry={inquiry} />
        ))}
      </ul>
    </div>
  );
}

function TrashRow({ inquiry }: { inquiry: Inquiry }) {
  const [pending, startTransition] = useTransition();
  const deletedAt = inquiry.deleted_at!;
  const eligible = isEligibleForPermanentDelete(deletedAt);
  const daysLeft = daysUntilEligible(deletedAt);

  function restore() {
    startTransition(async () => {
      try {
        await restoreInquiry(inquiry.id);
        toast.success("Restored");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to restore");
      }
    });
  }

  function deleteForever() {
    if (!window.confirm(`Permanently delete this inquiry from ${inquiry.name}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await permanentlyDeleteInquiry(inquiry.id);
        toast.success("Deleted permanently");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
      <div className="min-w-0">
        <p className="font-heading text-base text-foreground">{inquiry.name}</p>
        <p className="text-sm text-muted-foreground">{inquiry.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
          {departmentCopy(inquiry.department).label} · Trashed {new Date(deletedAt).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={restore}
        >
          <RotateCcw className="size-3.5" />
          Restore
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={pending || !eligible}
          title={eligible ? undefined : `Available in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
          onClick={deleteForever}
        >
          <Trash2 className="size-3.5" />
          {eligible ? "Delete forever" : `Available in ${daysLeft}d`}
        </Button>
      </div>
    </li>
  );
}
