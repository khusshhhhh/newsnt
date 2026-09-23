"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS: [string, string][] = [
  ["Ctrl / ⌘ + K", "Search everything, or jump to a page"],
  ["/", "Focus this page's search box"],
  ["N", "New item on this page (product, series, quote…)"],
  ["J / K", "Move down / up through list rows"],
  ["Enter", "Open the selected row"],
  ["Ctrl / ⌘ + S", "Save the form you're editing"],
  ["?", "Show this list"],
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Page-agnostic admin shortcuts, driven by data attributes pages opt into:
 * `data-admin-search` on a page's search input, `data-admin-new` on its
 * "New …" link, and `data-admin-row` on each focusable list row.
 */
export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "/") {
        const input = document.querySelector<HTMLInputElement>("[data-admin-search]");
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }
      if (e.key === "n" || e.key === "N") {
        const link = document.querySelector<HTMLElement>("[data-admin-new]");
        if (link) {
          e.preventDefault();
          link.click();
        }
        return;
      }
      if (e.key === "j" || e.key === "k") {
        const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-admin-row]"));
        if (rows.length === 0) return;
        e.preventDefault();
        const current = rows.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "j" ? Math.min(current + 1, rows.length - 1) : Math.max(current - 1, 0);
        rows[current === -1 ? 0 : next].focus();
        rows[current === -1 ? 0 : next].scrollIntoView({ block: "nearest" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="contents">
              <dt>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">{key}</kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
