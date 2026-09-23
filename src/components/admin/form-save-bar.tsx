"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEAVE_MESSAGE = "You have unsaved changes. Leave this page and lose them?";

/**
 * A save/cancel bar pinned to the bottom of the viewport, so a long form
 * never hides its own submit button. It also watches its parent form: once
 * anything is edited it shows "Unsaved changes" and asks before the page is
 * closed, reloaded, or left through a link.
 */
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
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const markDirty = () => setDirty(true);
    const markClean = () => setDirty(false);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", markClean);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", markClean);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    // Client-side navigations (Next <Link>) don't fire beforeunload, so
    // catch clicks on same-site links too.
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || !anchor.href) return;
      if (ref.current?.closest("form")?.contains(anchor) && anchor.dataset.saveBarCancel === undefined) return;
      if (new URL(anchor.href).origin !== window.location.origin) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return (
    <div
      ref={ref}
      className="sticky bottom-0 z-10 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-b-0 border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80"
    >
      <p className="min-w-0 truncate text-sm">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : dirty ? (
          <span className="text-muted-foreground">Unsaved changes</span>
        ) : null}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {cancelHref && (
          <Link
            href={cancelHref}
            data-save-bar-cancel
            className={cn(buttonVariants({ variant: "ghost" }), pending && "pointer-events-none opacity-50")}
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
