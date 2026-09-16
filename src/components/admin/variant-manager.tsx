"use client";

import { useRef, useState, useTransition } from "react";
import { addProductVariant, deleteProductVariant } from "@/app/admin/actions";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProductVariantWithImages } from "@/lib/supabase/types";

export function VariantManager({
  productId,
  variants: initialVariants,
}: {
  productId: string;
  variants: ProductVariantWithImages[];
}) {
  const [variants, setVariants] = useState(initialVariants);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function addVariant(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const created = await addProductVariant(productId, formData);
        setVariants((prev) => [...prev, { ...created, product_images: [] }]);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add color");
      }
    });
  }

  function removeVariant(id: string) {
    if (!window.confirm("Remove this color? Its photos will be deleted too.")) return;
    setVariants((prev) => prev.filter((v) => v.id !== id));
    startTransition(() => {
      deleteProductVariant(id, productId);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {variants.map((variant) => (
        <div key={variant.id} className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="size-5 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: variant.color_hex ?? "transparent" }}
              />
              <span className="text-sm text-foreground">{variant.color_name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => removeVariant(variant.id)}
            >
              Remove
            </Button>
          </div>
          <ProductImageManager
            productId={productId}
            variantId={variant.id}
            images={variant.product_images}
            compact
          />
        </div>
      ))}

      <form
        ref={formRef}
        action={addVariant}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="color_name" className="text-xs text-muted-foreground">
            Color name
          </label>
          <Input id="color_name" name="color_name" placeholder="Matte Black" required className="w-44" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="color_hex" className="text-xs text-muted-foreground">
            Swatch
          </label>
          <input
            id="color_hex"
            name="color_hex"
            type="color"
            defaultValue="#1a1a1a"
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
          />
        </div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? "Adding…" : "Add color"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
