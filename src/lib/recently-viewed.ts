"use client";

import { useMemo } from "react";
import { createLocalList } from "@/lib/local-list";
import { isProductSnapshot, type ProductSnapshot } from "@/lib/product-snapshot";
import type { Department } from "@/lib/department";

export type RecentlyViewedItem = ProductSnapshot;

const recentlyViewed = createLocalList<RecentlyViewedItem>({
  storageKey: "flow-recently-viewed",
  // Both departments share the list, so keep enough for a full row of each.
  max: 16,
  keyOf: (item) => item.productId,
  isValid: isProductSnapshot,
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
