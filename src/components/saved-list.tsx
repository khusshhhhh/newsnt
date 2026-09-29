"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, Plus, X } from "lucide-react";
import { clearSavedProducts, removeSavedProduct, useSavedProducts } from "@/lib/saved-products";
import { basketKey, openQuoteBasket, useQuoteBasket } from "@/lib/quote-basket";
import { productImageUrl } from "@/lib/supabase/storage";
import { productHref, seriesIndexHref, type Department } from "@/lib/department";

const noop = () => () => {};

/** The Saved page's grid, read from the visitor's browser (see saved-products.ts). */
export function SavedList({ department }: { department: Department }) {
  const items = useSavedProducts(department);
  const basket = useQuoteBasket();
  // Storage is only readable after hydration; until then, don't flash the empty state.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  if (!hydrated) return <div className="h-64" aria-hidden />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <Heart className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-4 text-foreground">Nothing saved yet.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Tap the heart on any product to keep it here while you compare and decide.
        </p>
        <Link
          href={seriesIndexHref(department)}
          className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  function addAllToQuote() {
    let replaced = false;
    for (const item of items) {
      if (basket.has(basketKey(item.productId, item.variantId))) continue;
      const result = basket.addItem({
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        department: item.department,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        unitPrice: item.unitPrice,
      });
      replaced ||= result.replaced;
    }
    toast.success(
      replaced ? "Started a new quote request with your saved products." : "Saved products added to your quote request.",
      { action: { label: "View quote", onClick: openQuoteBasket } }
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {items.length} saved product{items.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => clearSavedProducts(department)}
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={addAllToQuote}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Add all to quote
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.productId}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card animate-fade-in"
          >
            <Link href={productHref(item)} className="relative block aspect-square">
              {item.imagePath ? (
                <Image
                  src={productImageUrl(item.imagePath)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => removeSavedProduct(item.productId)}
              aria-label={`Remove ${item.name} from saved`}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground ring-1 ring-border/60 transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <Link href={productHref(item)} className="flex flex-1 flex-col gap-1 p-4">
              {item.seriesName && (
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.seriesName}</span>
              )}
              <span className="font-heading text-base text-foreground">{item.name}</span>
              {item.variantLabel && <span className="text-xs text-muted-foreground">{item.variantLabel}</span>}
              <span className="text-sm text-muted-foreground">{item.priceLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

