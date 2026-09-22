"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A save/cancel bar that stays pinned to the bottom of the viewport, so a long form never hides its own submit button. */
export function FormSaveBar({
  pending,
  pendingLabel,
  label,
  cancelHref,
  error,
}: {
  pending: boolean;
  pendingLabel: string;
  label: string;
  cancelHref?: string;
  error?: string | null;
}) {
  return (
    <div className="sticky bottom-0 z-10 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-b-0 border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <p className="min-w-0 truncate text-sm text-destructive">{error}</p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {cancelHref && (
          <Link
            href={cancelHref}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              pending && "pointer-events-none opacity-50"
            )}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" loading={pending} loadingText={pendingLabel} title="Ctrl/Cmd+S">
          {label}
        </Button>
      </div>
    </div>
  );
}
