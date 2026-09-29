"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductWithRelations } from "@/lib/supabase/types";
import { productImageUrl } from "@/lib/supabase/storage";
import { productHref } from "@/lib/department";
import { getDefaultVariant } from "@/lib/colors";
import { productPriceLabel } from "@/lib/format";
import { STOCK_STATUS_LABEL } from "@/lib/stock-status";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  preferredColorName,
  eager = false,
}: {
  product: ProductWithRelations;
  /** Load the photo immediately instead of lazily — for the first row of a listing, which is on screen at load. */
  eager?: boolean;
  /** Pre-selects a color on load — used on a finish's own listing page so the card already shows that finish instead of its default color. */
  preferredColorName?: string;
}) {
  const variants = product.variants ?? [];
  const [selectedColorName, setSelectedColorName] = useState<string | null>(preferredColorName ?? null);

  const selectedVariant = selectedColorName
    ? variants.find((v) => v.color_name === selectedColorName) ?? null
    : null;
  // Falls back to the default color's (Matte Black, or the first available)
  // photos when the product has no general gallery of its own.
  const defaultVariant = getDefaultVariant(variants);
  const image =
    selectedVariant?.product_images?.[0] ?? product.product_images?.[0] ?? defaultVariant?.product_images?.[0];
  const stockStatus = selectedVariant?.stock_status ?? defaultVariant?.stock_status ?? product.stock_status;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={productHref(product)} className="relative block aspect-square w-full overflow-hidden">
        {image ? (
          <Image
            src={productImageUrl(image.storage_path)}
            alt={image.alt_text ?? product.name}
            fill
            loading={eager ? "eager" : undefined}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link href={productHref(product)} className="flex flex-col gap-1">
          {product.series && (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.series.name}
            </span>
          )}
          <h3 className="font-heading text-base text-foreground">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{productPriceLabel(product)}</p>
          {stockStatus !== "in_stock" && (
            <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {STOCK_STATUS_LABEL[stockStatus]}
            </span>
          )}
        </Link>
        {variants.length > 1 && (
          <div className="mt-auto flex items-center gap-1.5 pt-2">
            {variants.slice(0, 4).map((v) => (
              <button
                key={v.id}
                type="button"
                title={v.color_name}
                aria-label={`Show ${v.color_name}`}
                aria-pressed={(selectedColorName ?? defaultVariant?.color_name) === v.color_name}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedColorName(v.color_name);
                }}
                className={cn(
                  "size-3.5 shrink-0 rounded-full border transition-shadow",
                  (selectedColorName ?? defaultVariant?.color_name) === v.color_name
                    ? "border-foreground ring-1 ring-foreground ring-offset-1 ring-offset-card"
                    : "border-border"
                )}
                style={{ backgroundColor: v.color_hex ?? "transparent" }}
              />
            ))}
            {variants.length > 4 && (
              <span className="text-xs text-muted-foreground">+{variants.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
