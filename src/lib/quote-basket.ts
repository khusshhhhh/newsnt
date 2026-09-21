"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Department } from "@/lib/department";

export type QuoteBasketItem = {
  id: string;
  name: string;
  slug: string;
  department: Department;
  quantity: number;
};

const STORAGE_KEY = "flow-quote-basket";
const CHANGE_EVENT = "quote-basket-changed";
const EMPTY: QuoteBasketItem[] = [];
const MAX_QUANTITY = 99;

function readFromStorage(): QuoteBasketItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as (QuoteBasketItem | Omit<QuoteBasketItem, "quantity">)[];
    // Older baskets saved before quantities existed have no `quantity` field — treat as 1.
    return parsed.map((item) => ({ ...item, quantity: "quantity" in item ? item.quantity : 1 }));
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

/**
 * A visitor's running list of products for one combined "get a quote"
 * request, kept in localStorage since there are no customer accounts — it
 * has no expiry, so a shopper who leaves and comes back days later finds
 * their selections untouched. Scoped to a single department at a time —
 * adding a product from a different department starts a fresh basket
 * rather than mixing the two, since one inquiry submission carries a
 * single `department` value. The same product can be added more than
 * once; repeat adds just bump its quantity.
 */
export function useQuoteBasket() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: Omit<QuoteBasketItem, "quantity">, quantity = 1) => {
    const current = readFromStorage();
    const replaced = current.length > 0 && current[0].department !== item.department;
    const base = replaced ? [] : current;
    const existing = base.find((i) => i.id === item.id);
    const next = existing
      ? base.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + quantity) }
            : i
        )
      : [...base, { ...item, quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)) }];
    writeBasket(next);
    return { replaced };
  }, []);

  const removeItem = useCallback((id: string) => {
    writeBasket(readFromStorage().filter((i) => i.id !== id));
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    const clamped = Math.round(quantity);
    if (clamped <= 0) {
      writeBasket(readFromStorage().filter((i) => i.id !== id));
      return;
    }
    writeBasket(
      readFromStorage().map((i) =>
        i.id === id ? { ...i, quantity: Math.min(MAX_QUANTITY, clamped) } : i
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
    has: (id: string) => items.some((i) => i.id === id),
    quantityOf: (id: string) => items.find((i) => i.id === id)?.quantity ?? 0,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
