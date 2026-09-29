"use client";

import { useMemo } from "react";
import { createLocalList } from "@/lib/local-list";
import { isDepartment, type Department } from "@/lib/department";

type RecentSearch = { department: Department; query: string };

function isRecentSearch(item: unknown): item is RecentSearch {
  if (!item || typeof item !== "object") return false;
  const i = item as Record<string, unknown>;
  return typeof i.query === "string" && typeof i.department === "string" && isDepartment(i.department);
}

const keyOf = (s: RecentSearch) => `${s.department}:${s.query.toLowerCase()}`;

const recentSearches = createLocalList<RecentSearch>({
  storageKey: "flow-recent-searches",
  max: 10,
  keyOf,
  isValid: isRecentSearch,
});

/**
 * Remembers a search once the visitor has paused on it. If they then type on
 * past their latest saved term ("bas" → "basin"), or backspace into it, that
 * entry is replaced rather than every intermediate prefix piling up.
 */
export function recordRecentSearch(department: Department, rawQuery: string) {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length < 2) return;
  const lower = query.toLowerCase();
  const latest = recentSearches.peek().find((s) => s.department === department);
  const latestLower = latest?.query.toLowerCase();
  const supersededKey =
    latest && latestLower && (lower.startsWith(latestLower) || latestLower.startsWith(lower)) ? keyOf(latest) : null;
  recentSearches.add({ department, query }, (existing) => keyOf(existing) === supersededKey);
}

export function removeRecentSearch(department: Department, query: string) {
  recentSearches.remove(keyOf({ department, query }));
}

export function clearRecentSearches(department: Department) {
  recentSearches.removeWhere((s) => s.department === department);
}

export function useRecentSearches(department: Department) {
  const items = recentSearches.useItems();
  return useMemo(() => items.filter((s) => s.department === department).map((s) => s.query), [items, department]);
}
