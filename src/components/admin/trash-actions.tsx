"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Restore / Delete forever buttons for one row on /admin/trash. */
export function TrashActions({
  name,
  restore,
  purge,
}: {
  name: string;
  restore: () => Promise<void>;
  purge?: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, done: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(done);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(restore, `“${name}” restored`)}>
        Restore
      </Button>
      {purge && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (!window.confirm(`Permanently delete “${name}”? Its photos are removed too. This cannot be undone.`)) return;
            run(purge, `“${name}” permanently deleted`);
          }}
        >
          Delete forever
        </Button>
      )}
    </div>
  );
}
