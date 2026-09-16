"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ProductGallery } from "@/components/product-gallery";
import type { ProductImage, ProductVariantWithImages } from "@/lib/supabase/types";

export function ProductMedia({
  productName,
  generalImages,
  variants,
}: {
  productName: string;
  generalImages: ProductImage[];
  variants: ProductVariantWithImages[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    generalImages.length > 0 ? null : (variants[0]?.id ?? null)
  );

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null;
  const images = useMemo(() => {
    if (selectedVariant && selectedVariant.product_images.length > 0) {
      return selectedVariant.product_images;
    }
    return generalImages;
  }, [selectedVariant, generalImages]);

  return (
    <div className="flex flex-col gap-4">
      <ProductGallery key={selectedVariant?.id ?? "default"} images={images} productName={productName} />

      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-foreground">
            Colour{selectedVariant ? `: ${selectedVariant.color_name}` : ""}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {generalImages.length > 0 && (
              <SwatchButton
                label="Default"
                active={selectedId === null}
                onClick={() => setSelectedId(null)}
                colorHex={null}
              />
            )}
            {variants.map((variant) => (
              <SwatchButton
                key={variant.id}
                label={variant.color_name}
                active={selectedId === variant.id}
                onClick={() => setSelectedId(variant.id)}
                colorHex={variant.color_hex}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SwatchButton({
  label,
  colorHex,
  active,
  onClick,
}: {
  label: string;
  colorHex: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="relative flex flex-col items-center gap-1"
    >
      <motion.span
        whileTap={{ scale: 0.92 }}
        className={cn(
          "flex size-8 items-center justify-center rounded-full border transition-shadow",
          active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "border-border"
        )}
        style={{ backgroundColor: colorHex ?? "transparent" }}
      >
        {!colorHex && (
          <span className="size-full rounded-full bg-[repeating-linear-gradient(45deg,var(--border),var(--border)_2px,transparent_2px,transparent_5px)]" />
        )}
      </motion.span>
    </button>
  );
}
