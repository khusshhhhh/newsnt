"use client";

import { useMemo } from "react";
import { createLocalList } from "@/lib/local-list";
import { isProductSnapshot, type ProductSnapshot } from "@/lib/product-snapshot";
import type { Department } from "@/lib/department";

/**
 * A product the visitor has hearted, plus the colour they were looking at when
 * they saved it — so "Add all to quote" requests that colour, not a default.
 */
export type SavedProduct = ProductSnapshot & {
  variantId: string | null;
  variantLabel: string | null;
  unitPrice: number | null;
};

function isSavedProduct(item: unknown): item is SavedProduct {
  if (!isProductSnapshot(item)) return false;
  const i = item as Record<string, unknown>;
  return (
    (i.variantId === null || typeof i.variantId === "string") &&
    (i.variantLabel === null || typeof i.variantLabel === "string") &&
    (i.unitPrice === null || typeof i.unitPrice === "number")
  );
}

const savedProducts = createLocalList<SavedProduct>({
  storageKey: "flow-saved-products",
  max: 100,
  keyOf: (item) => item.productId,
  isValid: isSavedProduct,
});

/** Saves `item`, or un-saves it if it's already saved. Returns whether it's saved now. */
export function toggleSavedProduct(item: SavedProduct) {
  if (savedProducts.peek().some((i) => i.productId === item.productId)) {
    savedProducts.remove(item.productId);
    return false;
  }
  savedProducts.add(item);
  return true;
}

export const removeSavedProduct = savedProducts.remove;

export function clearSavedProducts(department: Department) {
  savedProducts.removeWhere((i) => i.department === department);
}

/** This department's saved products, most recently saved first. */
export function useSavedProducts(department: Department) {
  const items = savedProducts.useItems();
  return useMemo(() => items.filter((i) => i.department === department), [items, department]);
}

export function useIsSaved(productId: string) {
  return savedProducts.useItems().some((i) => i.productId === productId);
}
