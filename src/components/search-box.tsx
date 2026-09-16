"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { searchHref } from "@/lib/department";
import type { Department } from "@/lib/department";

/**
 * Debounces input into a client-side route replace (wrapped in a transition
 * so the results stream in without unmounting this input or flashing the
 * route's loading skeleton). Stays a real <form> so it degrades to a normal
 * GET submission with JS disabled.
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

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        router.replace(searchHref(department, next || undefined), { scroll: false });
      });
    }, 350);
  }

  return (
    <form
      action={`/${department}/search`}
      className="mb-10 max-w-xl"
      onSubmit={() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      }}
    >
      <label htmlFor="q" className="mb-2 block text-sm text-muted-foreground">
        Search products
      </label>
      <div className="flex items-center gap-3 border-b-2 border-foreground pb-2">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          id="q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
          autoComplete="off"
          placeholder="Search by name, SKU, or description…"
          className="w-full bg-transparent font-heading text-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {isPending && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
    </form>
  );
}
