"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { productImageUrl } from "@/lib/supabase/storage";
import type { ProductImage } from "@/lib/supabase/types";

/**
 * Give this a `key` that changes whenever the image *set* changes (e.g. the
 * selected color) — remounting is how the active thumbnail resets, rather
 * than syncing it with an effect.
 */
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
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={productImageUrl(active.storage_path)}
              alt={active.alt_text ?? productName}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-contain p-10"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition-colors",
                index === activeIndex
                  ? "border-foreground"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <Image
                src={productImageUrl(image.storage_path)}
                alt={image.alt_text ?? productName}
                fill
                sizes="64px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
