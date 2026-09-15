"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { productImageUrl } from "@/lib/supabase/storage";
import type { ProductImage } from "@/lib/supabase/types";

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border/70 bg-muted text-sm text-muted-foreground">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted">
        <Image
          src={productImageUrl(active.storage_path)}
          alt={active.alt_text ?? productName}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-colors",
                index === activeIndex
                  ? "border-primary"
                  : "border-border/70 hover:border-muted-foreground"
              )}
            >
              <Image
                src={productImageUrl(image.storage_path)}
                alt={image.alt_text ?? productName}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
