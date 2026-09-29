"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, History, X } from "lucide-react";
import { searchHref } from "@/lib/department";
import type { Department } from "@/lib/department";
import {
  clearRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
  useRecentSearches,
} from "@/lib/recent-searches";

/** How long a query has to sit unchanged before it's remembered as a recent search. */
const REMEMBER_AFTER_MS = 1500;

/**
 * Debounces input into a client-side route replace (wrapped in a transition
 * so the results stream in without unmounting this input or flashing the
 * route's loading skeleton). Stays a real <form> so it degrades to a normal
 * GET submission with JS disabled. While the field is empty it offers the
 * visitor's own recent searches in this department.
 */
export function SearchBox({
  department,
  initialQuery,
}: {
  department: Department;
  initialQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rememberRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useRecentSearches(department);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (rememberRef.current) clearTimeout(rememberRef.current);
  }, []);

  function navigate(next: string) {
    startTransition(() => {
      router.replace(searchHref(department, next || undefined), { scroll: false });
    });
  }

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (rememberRef.current) clearTimeout(rememberRef.current);
    debounceRef.current = setTimeout(() => navigate(next), 350);
    rememberRef.current = setTimeout(() => recordRecentSearch(department, next), REMEMBER_AFTER_MS);
  }

  function runRecent(query: string) {
    setValue(query);
    recordRecentSearch(department, query);
    navigate(query);
    inputRef.current?.focus();
  }

  const showRecent = value.trim() === "" && recent.length > 0;

  return (
    <form
      action={`/${department}/search`}
      className="mb-10 max-w-xl"
      onSubmit={() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (rememberRef.current) clearTimeout(rememberRef.current);
        recordRecentSearch(department, value);
      }}
    >
      <label htmlFor="q" className="mb-2 block text-sm text-muted-foreground">
        Search products
      </label>
      <div className="flex items-center gap-3 border-b-2 border-foreground pb-2">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          id="q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
          autoComplete="off"
          placeholder="Search by product name or SKU…"
          className="w-full bg-transparent font-heading text-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {isPending && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      {showRecent && (
        <div className="mt-4 animate-fade-in">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <History className="size-3.5" aria-hidden />
              Recent searches
            </span>
            <button
              type="button"
              onClick={() => clearRecentSearches(department)}
              className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((query) => (
              <li key={query} className="flex items-center rounded-full border border-border text-sm">
                <button
                  type="button"
                  onClick={() => runRecent(query)}
                  className="rounded-l-full py-1.5 pr-1 pl-3 text-foreground transition-colors hover:text-foreground/70"
                >
                  {query}
                </button>
                <button
                  type="button"
                  onClick={() => removeRecentSearch(department, query)}
                  aria-label={`Remove “${query}” from recent searches`}
                  className="mr-1 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
