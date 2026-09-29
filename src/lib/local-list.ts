"use client";

import { useSyncExternalStore } from "react";

/**
 * A small, capped, most-recent-first list kept in localStorage and shared
 * across components and tabs — the quote basket's pattern, for lists that are
 * only a convenience (recently viewed, recent searches). If storage is blocked
 * or cleared the list is simply empty; nothing here should ever throw.
 */
export function createLocalList<T>({
  storageKey,
  max,
  keyOf,
  isValid,
}: {
  storageKey: string;
  max: number;
  /** Identity of an entry: adding one with the same key moves it to the front instead of duplicating it. */
  keyOf: (item: T) => string;
  /** Guards against stale or hand-edited storage. */
  isValid: (item: unknown) => item is T;
}) {
  const EMPTY: T[] = [];
  const changeEvent = `${storageKey}-changed`;
  // Read lazily (not at module load) so importing this on the server is free.
  let cache: T[] | null = null;

  function read(): T[] {
    if (typeof window === "undefined") return EMPTY;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return EMPTY;
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValid).slice(0, max) : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  function write(items: T[]) {
    cache = items;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Storage unavailable (private mode, blocked) — the list just won't persist.
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  function subscribe(callback: () => void) {
    function handleChange(e: Event) {
      if (e instanceof StorageEvent && e.key !== null && e.key !== storageKey) return;
      cache = read();
      callback();
    }
    window.addEventListener(changeEvent, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(changeEvent, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }

  function getSnapshot() {
    if (cache === null) cache = read();
    return cache;
  }

  return {
    /**
     * Puts `item` at the front. `supersedes` also drops any other entries it
     * returns true for (e.g. a shorter search the visitor kept typing past).
     */
    add(item: T, supersedes?: (existing: T) => boolean) {
      const key = keyOf(item);
      write([item, ...read().filter((i) => keyOf(i) !== key && !supersedes?.(i))].slice(0, max));
    },
    remove(key: string) {
      write(read().filter((i) => keyOf(i) !== key));
    },
    removeWhere(predicate: (item: T) => boolean) {
      write(read().filter((i) => !predicate(i)));
    },
    /** The stored list right now, outside React. */
    peek: read,
    clear() {
      write([]);
    },
    /** Empty on the server and during hydration, then the stored list. */
    useItems() {
      return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
    },
  };
}
