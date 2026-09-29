"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { toggleSavedProduct, useIsSaved } from "@/lib/saved-products";
import { productSnapshot } from "@/lib/product-snapshot";
import { savedHref } from "@/lib/department";
import { cn } from "@/lib/utils";
import type { ProductVariantWithImages, ProductWithRelations } from "@/lib/supabase/types";

/**
 * Heart toggle for the visitor's saved list (see saved-products.ts). `icon`
 * is the round button over a product card's photo; `pill` is the labelled one
 * on the product page. Saves the colour currently shown, for quoting later.
 */
export function SaveButton({
  product,
  variant,
  appearance = "pill",
  className,
}: {
  product: ProductWithRelations;
  variant?: ProductVariantWithImages | null;
  appearance?: "icon" | "pill";
  className?: string;
}) {
  const router = useRouter();
  const saved = useIsSaved(product.id);

  function toggle(e: React.MouseEvent) {
    // Card hearts sit over a link to the product.
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleSavedProduct({
      ...productSnapshot(product, variant),
      variantId: variant?.id ?? null,
      variantLabel: variant?.color_name ?? null,
      unitPrice: variant?.price ?? product.price,
    });
    if (nowSaved) {
      toast.success(`Saved ${product.name}`, {
        action: { label: "View saved", onClick: () => router.push(savedHref(product.department)) },
      });
    } else {
      toast(`Removed ${product.name} from saved`);
    }
  }

  const label = saved ? `Remove ${product.name} from saved` : `Save ${product.name}`;

  if (appearance === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={label}
        title={saved ? "Saved" : "Save"}
        className={cn(
          "flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur transition-[opacity,transform] duration-200 hover:scale-105 active:scale-95",
          !saved && "can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:focus-visible:opacity-100",
          className
        )}
      >
        <Heart className={cn("size-4", saved && "fill-current")} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        saved
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        className
      )}
    >
      <Heart className={cn("size-3.5", saved && "fill-current")} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
