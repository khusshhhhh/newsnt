"use client";

import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowRight, Heart, Menu, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  categoryHref,
  departmentCopy,
  departmentHref,
  finishHref,
  otherDepartment,
  projectsHref,
  savedHref,
  searchHref,
  seriesHref,
  type Department,
} from "@/lib/department";
import type { Category, Finish, Series } from "@/lib/supabase/types";

export function MobileNav({
  department,
  series,
  categories,
  finishes,
}: {
  department: Department;
  series: Series[];
  categories: Category[];
  finishes: Finish[];
}) {
  const copy = departmentCopy(department);
  const other = otherDepartment(department);

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        aria-label="Open menu"
        className={buttonVariants({ variant: "outline", size: "icon", className: "md:hidden" })}
      >
        <Menu className="size-4" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-background text-foreground outline-none duration-300 data-open:animate-in data-open:slide-in-from-right-full data-closed:animate-out data-closed:slide-out-to-right-full">
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>

          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Menu
            </span>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <DialogPrimitive.Close
              render={<Link href={searchHref(department)} />}
              nativeButton={false}
              className="mb-9 flex items-center justify-between rounded-full border border-border px-5 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              Search the catalogue
              <Search className="size-4" />
            </DialogPrimitive.Close>

            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {copy.seriesLabel}
            </p>
            <ul className="mb-9 flex flex-col">
              {series.length > 0 ? (
                series.map((s, i) => (
                  <li key={s.id} className="border-b border-border first:border-t">
                    <DialogPrimitive.Close
                      render={<Link href={seriesHref(s)} />}
                      nativeButton={false}
                      className="group flex items-center gap-3 py-3.5"
                    >
                      <span className="font-heading text-xs text-muted-foreground/50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 font-heading text-xl font-black tracking-tight text-foreground transition-transform duration-200 group-active:translate-x-1">
                        {s.name}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-active:translate-x-1" />
                    </DialogPrimitive.Close>
                  </li>
                ))
              ) : (
                <li className="py-3 text-sm text-muted-foreground">Coming soon</li>
              )}
            </ul>

            {categories.length > 0 && (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Categories
                </p>
                <div className="mb-9 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <DialogPrimitive.Close
                      key={c.id}
                      render={<Link href={categoryHref(c)} />}
                      nativeButton={false}
                      className="rounded-full border border-border px-4 py-2 text-sm text-foreground/85 transition-colors hover:border-foreground hover:text-foreground"
                    >
                      {c.name}
                    </DialogPrimitive.Close>
                  ))}
                </div>
              </>
            )}

            {finishes.length > 0 && (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Finishes
                </p>
                <div className="flex flex-wrap gap-2">
                  {finishes.map((f) => (
                    <DialogPrimitive.Close
                      key={f.id}
                      render={<Link href={finishHref(department, f.code)} />}
                      nativeButton={false}
                      className="flex items-center gap-1.5 rounded-full border border-border py-2 pl-2.5 pr-4 text-sm text-foreground/85 transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-full ring-1 ring-border"
                        style={{ background: f.hex }}
                      />
                      {f.name}
                    </DialogPrimitive.Close>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-border px-6 py-5">
            <DialogPrimitive.Close
              render={<Link href={savedHref(department)} />}
              nativeButton={false}
              className="flex items-center justify-between py-2 text-sm font-semibold text-foreground"
            >
              Saved products
              <Heart className="size-4" />
            </DialogPrimitive.Close>
            <DialogPrimitive.Close
              render={<Link href={projectsHref(department)} />}
              nativeButton={false}
              className="flex items-center justify-between py-2 text-sm font-semibold text-foreground"
            >
              Projects
              <ArrowRight className="size-4" />
            </DialogPrimitive.Close>
            <DialogPrimitive.Close
              render={<Link href={departmentHref(other)} />}
              nativeButton={false}
              className="mt-1 flex items-center justify-between py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Switch to {departmentCopy(other).label}
              <ArrowRight className="size-4" />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
