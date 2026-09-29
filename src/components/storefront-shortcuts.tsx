"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchHref, type Department } from "@/lib/department";

/**
 * Press "/" anywhere on the storefront to jump to search — the convention
 * from GitHub, YouTube and most docs sites. Ignored while typing in a field.
 */
export function StorefrontShortcuts({ department }: { department: Department }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog']")) {
        return;
      }
      e.preventDefault();
      const searchInput = document.getElementById("q");
      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus();
        searchInput.select();
      } else {
        router.push(searchHref(department));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [department, router]);

  return null;
}
