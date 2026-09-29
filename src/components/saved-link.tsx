"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useSavedProducts } from "@/lib/saved-products";
import { savedHref, type Department } from "@/lib/department";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Header link to the Saved page — only shown once something is saved, like the quote basket. */
export function SavedLink({ department }: { department: Department }) {
  const count = useSavedProducts(department).length;
  if (count === 0) return null;
  return (
    <Link
      href={savedHref(department)}
      aria-label={`Saved products (${count})`}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative animate-fade-in")}
    >
      <Heart className="size-4" />
      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
