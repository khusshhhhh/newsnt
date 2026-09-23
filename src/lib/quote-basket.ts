"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Department } from "@/lib/department";

/**
 * One line in the quote basket. Keyed by product + variant together (see
 * `basketKey`) so the same product can appear more than once — e.g. "Lotus
 * Basin Mixer" in Matte Black and again in Brushed Gold — each with its own
 * quantity. `variantId`/`variantLabel` are null for products with no colour
 * variants.
 */
export type QuoteBasketItem = {
  key: string;
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
  name: string;
  slug: string;
  department: Department;
  quantity: number;
  /** Price when added (null = price on enquiry) — only for the basket's running estimate; staff quote the real price. */
  unitPrice: number | null;
};

type StoredItem = Partial<QuoteBasketItem> & { id?: string };

const STORAGE_KEY = "flow-quote-basket";
const CHANGE_EVENT = "quote-basket-changed";
/** Dispatch on window to open the basket dialog from anywhere (e.g. a toast's "View" button). */
export const OPEN_BASKET_EVENT = "quote-basket-open";

export function openQuoteBasket() {
  window.dispatchEvent(new Event(OPEN_BASKET_EVENT));
}
const EMPTY: QuoteBasketItem[] = [];
const MAX_QUANTITY = 99;

export function basketKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}::${variantId}` : productId;
}

function readFromStorage(): QuoteBasketItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StoredItem[];
    // Older baskets saved before quantities/variants existed only had
    // `id` (the product id) and no `quantity` — normalize those in place
    // so a returning visitor's basket keeps working after this update.
    return parsed
      .filter((item): item is StoredItem & { name: string; slug: string; department: Department } =>
        Boolean(item && (item.productId ?? item.id) && item.name && item.slug && item.department)
      )
      .map((item) => {
        const productId = item.productId ?? item.id!;
        const variantId = item.variantId ?? null;
        return {
          key: item.key ?? basketKey(productId, variantId),
          productId,
          variantId,
          variantLabel: item.variantLabel ?? null,
          name: item.name,
          slug: item.slug,
          department: item.department,
          quantity: item.quantity ?? 1,
          unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : null,
        };
      });
  } catch {
    return EMPTY;
  }
}

// A cached snapshot rather than re-parsing localStorage on every render —
// useSyncExternalStore requires getSnapshot to return a stable reference
// when nothing has actually changed.
let cache: QuoteBasketItem[] = readFromStorage();

function writeBasket(items: QuoteBasketItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable (private mode, blocked) — basket just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  function handleChange() {
    cache = readFromStorage();
    callback();
  }
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function getSnapshot() {
  return cache;
}

function getServerSnapshot() {
  return EMPTY;
}

export type AddQuoteBasketItem = {
  productId: string;
  name: string;
  slug: string;
  department: Department;
  variantId?: string | null;
  variantLabel?: string | null;
  unitPrice?: number | null;
};

/**
 * A visitor's running list of products for one combined "get a quote"
 * request, kept in localStorage since there are no customer accounts — it
 * has no expiry, so a shopper who leaves and comes back days later finds
 * their selections untouched. Scoped to a single department at a time —
 * adding a product from a different department starts a fresh basket
 * rather than mixing the two, since one inquiry submission carries a
 * single `department` value. The same product can be added more than
 * once, including in a different colour/variant — each product+variant
 * combination is its own line with its own quantity.
 */
export function useQuoteBasket() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: AddQuoteBasketItem, quantity = 1) => {
    const current = readFromStorage();
    const replaced = current.length > 0 && current[0].department !== item.department;
    const base = replaced ? [] : current;
    const variantId = item.variantId ?? null;
    const key = basketKey(item.productId, variantId);
    const existing = base.find((i) => i.key === key);
    const next = existing
      ? base.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + quantity) } : i
        )
      : [
          ...base,
          {
            key,
            productId: item.productId,
            variantId,
            variantLabel: item.variantLabel ?? null,
            name: item.name,
            slug: item.slug,
            department: item.department,
            quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)),
            unitPrice: item.unitPrice ?? null,
          },
        ];
    writeBasket(next);
    return { replaced };
  }, []);

  const removeItem = useCallback((key: string) => {
    writeBasket(readFromStorage().filter((i) => i.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const clamped = Math.round(quantity);
    if (clamped <= 0) {
      writeBasket(readFromStorage().filter((i) => i.key !== key));
      return;
    }
    writeBasket(
      readFromStorage().map((i) =>
        i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, clamped) } : i
      )
    );
  }, []);

  const clear = useCallback(() => writeBasket([]), []);

  return {
    items,
    addItem,
    removeItem,
    setQuantity,
    clear,
    has: (key: string) => items.some((i) => i.key === key),
    quantityOf: (key: string) => items.find((i) => i.key === key)?.quantity ?? 0,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    /** Sum of the priced lines, and whether any line is "price on enquiry". */
    estimate: {
      total: items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0),
      hasUnpriced: items.some((i) => i.unitPrice == null),
    },
  };
}
