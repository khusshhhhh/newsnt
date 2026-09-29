"use client";

import { useMemo } from "react";
import { createLocalList } from "@/lib/local-list";
import { isDepartment, type Department } from "@/lib/department";

/**
 * Enough of a product to draw a small card without fetching it again. Held
 * only in the visitor's own browser; a renamed or unpublished product can
 * linger here until it's viewed again or pushed off the end, which is fine
 * for a "pick up where you left off" row (its link 404s politely).
 */
export type RecentlyViewedItem = {
  productId: string;
  department: Department;
  slug: string;
  name: string;
  seriesName: string | null;
  imagePath: string | null;
  priceLabel: string;
};

function isRecentlyViewedItem(item: unknown): item is RecentlyViewedItem {
  if (!item || typeof item !== "object") return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.productId === "string" &&
    typeof i.slug === "string" &&
    typeof i.name === "string" &&
    typeof i.priceLabel === "string" &&
    typeof i.department === "string" &&
    isDepartment(i.department)
  );
}

const recentlyViewed = createLocalList<RecentlyViewedItem>({
  storageKey: "flow-recently-viewed",
  // Both departments share the list, so keep enough for a full row of each.
  max: 16,
  keyOf: (item) => item.productId,
  isValid: isRecentlyViewedItem,
});

export const recordRecentlyViewed = recentlyViewed.add;
export const clearRecentlyViewed = recentlyViewed.clear;

/** This department's recently viewed products, newest first, optionally leaving one out (the page you're on). */
export function useRecentlyViewed(department: Department, excludeProductId?: string) {
  const items = recentlyViewed.useItems();
  return useMemo(
    () => items.filter((i) => i.department === department && i.productId !== excludeProductId),
    [items, department, excludeProductId]
  );
}
