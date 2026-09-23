"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { adminGlobalSearch, type AdminSearchResult } from "@/lib/actions/admin/search";
import { NAV_ICONS } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";
import type { AdminNavGroup } from "@/lib/admin-nav";

type Item = { key: string; title: string; subtitle?: string; href: string; icon?: string };

const TYPE_LABEL: Record<AdminSearchResult["type"], string> = {
  product: "Product",
  customer: "Customer",
  quote: "Quote",
  order: "Order",
  inquiry: "Inquiry",
};

/** Opens a palette with Ctrl/⌘+K anywhere in the admin — jump to a page, or search products, customers, quotes and orders. */
export function CommandPalette({ groups }: { groups: AdminNavGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin:open-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin:open-palette", onOpenEvent);
    };
  }, []);

  const term = query.trim();
  useEffect(() => {
    const id = ++requestId.current;
    if (term.length < 2) return;
    const timer = setTimeout(() => {
      setLoading(true);
      adminGlobalSearch(term)
        .then((data) => {
          if (requestId.current === id) setResults(data);
        })
        .catch(() => {
          if (requestId.current === id) setResults([]);
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [term]);

  const items = useMemo<Item[]>(() => {
    const lower = term.toLowerCase();
    const pages = groups
      .flatMap((g) => g.links)
      .filter((l) => !lower || l.label.toLowerCase().includes(lower))
      .map((l) => ({ key: `page:${l.href}`, title: l.label, subtitle: "Go to page", href: l.href, icon: l.icon }));
    const found = term.length >= 2 ? results : [];
    return [
      ...pages,
      ...found.map((r) => ({ key: `${r.type}:${r.id}`, title: r.title, subtitle: `${TYPE_LABEL[r.type]} · ${r.subtitle}`, href: r.href })),
    ];
  }, [groups, results, term]);

  function go(item: Item | undefined) {
    if (!item) return;
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-150 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Popup
          aria-label="Search the admin panel"
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, items.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(items[active]);
                }
              }}
              placeholder="Search products, customers, quotes, orders…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded="true"
              aria-controls="admin-palette-results"
              aria-activedescendant={items[active] ? `palette-${items[active].key}` : undefined}
            />
            {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>
          <ul id="admin-palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
            {items.map((item, i) => {
              const Icon = item.icon ? NAV_ICONS[item.icon] : ArrowRight;
              return (
                <li
                  key={item.key}
                  id={`palette-${item.key}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm",
                    i === active ? "bg-accent text-accent-foreground" : "text-foreground"
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.title}</span>
                    {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                  </span>
                </li>
              );
            })}
            {items.length === 0 && !loading && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches “{term}”.</li>
            )}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ to move · Enter to open · Esc to close</span>
            <span>Press ? for shortcuts</span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The "Search… Ctrl K" button in the sidebar — opens the same palette. */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("admin:open-palette"))}
      className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-sm text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
    >
      <Search className="size-3.5" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="rounded border border-sidebar-border px-1 text-[10px]">Ctrl K</kbd>
    </button>
  );
}
