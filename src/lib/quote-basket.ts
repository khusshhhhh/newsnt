"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Department } from "@/lib/department";

export type QuoteBasketItem = { id: string; name: string; slug: string; department: Department };

const STORAGE_KEY = "flow-quote-basket";
const CHANGE_EVENT = "quote-basket-changed";
const EMPTY: QuoteBasketItem[] = [];

function readFromStorage(): QuoteBasketItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuoteBasketItem[]) : EMPTY;
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
 * request, kept in localStorage since there are no customer accounts.
 * Scoped to a single department at a time — adding a product from a
 * different department starts a fresh basket rather than mixing the two,
 * since one inquiry submission carries a single `department` value.
 */
export function useQuoteBasket() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: QuoteBasketItem) => {
    const current = readFromStorage();
    if (current.some((i) => i.id === item.id)) return { replaced: false };
    const replaced = current.length > 0 && current[0].department !== item.department;
    writeBasket(replaced ? [item] : [...current, item]);
    return { replaced };
  }, []);

  const removeItem = useCallback((id: string) => {
    writeBasket(readFromStorage().filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => writeBasket([]), []);

  return {
    items,
    addItem,
    removeItem,
    clear,
    has: (id: string) => items.some((i) => i.id === id),
  };
}
