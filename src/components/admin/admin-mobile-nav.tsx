"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";

/** Off-canvas nav drawer for mobile/tablet — the sidebar in `admin/layout.tsx` is desktop (lg+) only. */
export function AdminMobileNav({ footer }: { footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close automatically once a nav link has actually navigated somewhere,
  // tracked by comparing against the pathname seen on the last render.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/30 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[80vw] flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6 shadow-xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">
          <div className="min-h-0 overflow-y-auto">
            <div className="mb-8 flex items-center justify-between">
              <Link href="/admin" className="text-sidebar-foreground">
                <Logo size="sm" />
              </Link>
              <DialogPrimitive.Close
                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <AdminNav />
          </div>
          {footer}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
