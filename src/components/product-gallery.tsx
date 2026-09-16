"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { productImageUrl } from "@/lib/supabase/storage";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const active = images[activeIndex];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border/60 bg-card text-sm text-muted-foreground">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label="Open full-size image"
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-border/60 bg-card"
      >
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
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-contain p-10"
            />
          </motion.div>
        </AnimatePresence>
        <span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-4" />
        </span>
      </button>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-card transition-colors",
                index === activeIndex
                  ? "border-foreground"
                  : "border-border/60 hover:border-muted-foreground"
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

      <Lightbox
        images={images}
        productName={productName}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        index={activeIndex}
        onIndexChange={setActiveIndex}
      />
    </div>
  );
}

function Lightbox({
  images,
  productName,
  open,
  onOpenChange,
  index,
  onIndexChange,
}: {
  images: ProductImage[];
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const active = images[index];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, images.length]);

  if (!active) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="fixed inset-0 top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-none bg-background/95 p-4 ring-0 backdrop-blur-sm sm:max-w-none sm:p-10"
      >
        <DialogTitle className="sr-only">{productName} — full-size image</DialogTitle>

        <div className="relative h-full w-full max-w-4xl">
          <Image
            src={productImageUrl(active.storage_path)}
            alt={active.alt_text ?? productName}
            fill
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent sm:left-4"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % images.length)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent sm:right-4"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-4 text-sm text-muted-foreground">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
