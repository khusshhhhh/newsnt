"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, History, Layers, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { recordRecentSearch, useRecentSearches } from "@/lib/recent-searches";
import { OPEN_SEARCH_EVENT, type SearchSuggestions } from "@/lib/search-suggestions";
import { productImageUrl } from "@/lib/supabase/storage";
import { departmentCopy, productHref, searchHref, type Department } from "@/lib/department";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 150;

type Option = { id: string; href: string; query?: string };

/**
 * The header's search button: opens a type-ahead over the catalog (products,
 * series and categories) as you type, with arrow-key navigation, and falls
 * through to the full search page on Enter. Opened by "/" or Ctrl/⌘+K too.
 */
export function HeaderSearch({ department }: { department: Department }) {
  const router = useRouter();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSuggestions | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const cacheRef = useRef(new Map<string, SearchSuggestions>());
  const recent = useRecentSearches(department).slice(0, 5);
  const copy = departmentCopy(department);

  const term = query.trim();
  const searching = term.length >= 2;
  const loading = searching && loadedQuery !== term && !failed;

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open || term.length < 2) return;
    const cached = cacheRef.current.get(term.toLowerCase());
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          let data = cached;
          if (!data) {
            const res = await fetch(
              `/api/search?department=${department}&q=${encodeURIComponent(term)}`,
              { signal: controller.signal }
            );
            if (!res.ok) throw new Error(`Search failed (${res.status})`);
            data = (await res.json()) as SearchSuggestions;
            cacheRef.current.set(term.toLowerCase(), data);
          }
          setResults(data);
          setLoadedQuery(term);
          setFailed(false);
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error(error);
            setFailed(true);
          }
        }
      },
      cached ? 0 : DEBOUNCE_MS
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, term, department]);

  // Only show results that belong to what's typed now (not a stale query's).
  const shown = searching && loadedQuery === term ? results : null;

  const seeAll: Option = { id: "all", href: searchHref(department, term), query: term };
  const options: Option[] = !searching
    ? recent.map((q) => ({ id: `r-${q}`, href: searchHref(department, q), query: q }))
    : shown
      ? [
          ...shown.collections.map((c) => ({ id: `c-${c.href}`, href: c.href })),
          ...shown.products.map((p) => ({ id: `p-${p.productId}`, href: productHref(p), query: term })),
          seeAll,
        ]
      : [];

  function optionDomId(option: Option) {
    return `${listboxId}-${option.id.replace(/[^\w-]/g, "_")}`;
  }

  function go(option: Option) {
    if (option.query) recordRecentSearch(department, option.query);
    // Dismissing keeps what was typed; picking something starts the next search fresh.
    setQuery("");
    setOpen(false);
    router.push(option.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[activeIndex];
      if (option) go(option);
      else if (term) go(seeAll);
    }
  }

  const activeOption = options[activeIndex];
  const optionProps = (option: Option, className?: string) => {
    const index = options.findIndex((o) => o.id === option.id);
    return {
      id: optionDomId(option),
      role: "option" as const,
      "aria-selected": index === activeIndex,
      onMouseEnter: () => setActiveIndex(index),
      onClick: () => go(option),
      className: cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
        index === activeIndex ? "bg-muted text-foreground" : "text-foreground",
        className
      ),
    };
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setActiveIndex(-1);
      }}
    >
      <DialogTrigger
        aria-label="Search"
        title="Search (/)"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Search className="size-4" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-3 flex max-h-[calc(100dvh-1.5rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-[12vh] sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search {copy.label}</DialogTitle>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? optionDomId(activeOption) : undefined}
            aria-label={`Search ${copy.label}`}
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search by product, series or SKU…"
            className="h-full w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div id={listboxId} role="listbox" aria-label="Suggestions" className="min-h-0 flex-1 overflow-y-auto p-2">
          {!searching &&
            (recent.length > 0 ? (
              <>
                <p className="px-3 pt-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent searches
                </p>
                {options.map((option) => (
                  <div key={option.id} {...optionProps(option)}>
                    <History className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{option.query}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Search products by name, series or SKU — small typos are fine.
              </p>
            ))}

          {searching && failed && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Suggestions aren&apos;t loading right now — press Enter to search anyway.
            </p>
          )}

          {searching && !shown && !failed && (
            <div className="flex flex-col gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <div className="size-12 animate-pulse rounded-md bg-muted" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {shown && (
            <>
              {shown.collections.length > 0 && (
                <>
                  <p className="px-3 pt-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Collections
                  </p>
                  {shown.collections.map((c) => {
                    const option = { id: `c-${c.href}`, href: c.href };
                    return (
                      <div key={option.id} {...optionProps(option)}>
                        <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">
                          {c.name}
                          <span className="text-muted-foreground">
                            {c.kind === "series" ? ` · ${copy.seriesLabel.replace(/s$/, "")}` : " · Category"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              {shown.products.length > 0 ? (
                <>
                  <p className="px-3 pt-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Products
                  </p>
                  {shown.products.map((p) => {
                    const option = { id: `p-${p.productId}`, href: productHref(p) };
                    return (
                      <div key={option.id} {...optionProps(option)}>
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card">
                          {p.imagePath && (
                            <Image src={productImageUrl(p.imagePath)} alt="" fill sizes="48px" className="object-contain p-1" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {p.seriesName ? `${p.seriesName} · ` : ""}
                            {p.priceLabel}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  No products match &ldquo;{term}&rdquo; — try a shorter word or a SKU.
                </p>
              )}

              <div {...optionProps(seeAll, "mt-1 justify-between")}>
                <span>
                  {shown.total > 0
                    ? `See all ${shown.total} result${shown.total === 1 ? "" : "s"} for “${term}”`
                    : `Search the catalogue for “${term}”`}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
