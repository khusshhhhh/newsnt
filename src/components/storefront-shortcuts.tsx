"use client";

import { useEffect } from "react";
import { OPEN_SEARCH_EVENT } from "@/lib/search-suggestions";

/**
 * Press "/" (or Ctrl/⌘+K) anywhere on the storefront to open search — the
 * convention from GitHub, YouTube and most docs sites. "/" is ignored while
 * typing in a field.
 */
export function StorefrontShortcuts() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[role='dialog']")) return;
      const commandK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey;
      if (!commandK && !slash) return;
      if (slash && target?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;
      e.preventDefault();
      // On the search page itself, just focus its big search field.
      const searchInput = document.getElementById("q");
      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus();
        searchInput.select();
      } else {
        window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
