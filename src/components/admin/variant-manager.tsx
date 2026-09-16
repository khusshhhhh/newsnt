"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { addProductVariant, deleteProductVariant } from "@/lib/actions/admin/variants";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_COLORS } from "@/lib/colors";
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
  const [colorName, setColorName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const availableColors = useMemo(
    () => PRODUCT_COLORS.filter((c) => !variants.some((v) => v.color_name === c.name)),
    [variants]
  );
  // Base UI's <Select.Value> shows the raw `value` unless given an `items`
  // label map — harmless here since value === label, but kept consistent
  // with the other selects so a future non-identity value doesn't regress it.
  const colorItems = useMemo(
    () => Object.fromEntries(availableColors.map((c) => [c.name, c.name])),
    [availableColors]
  );

  function addVariant(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const created = await addProductVariant(productId, formData);
        setVariants((prev) => [...prev, { ...created, product_images: [] }]);
        formRef.current?.reset();
        setColorName("");
        toast.success(`${created.color_name} added`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to add color";
        setError(message);
        toast.error(message);
      }
    });
  }

  function removeVariant(id: string) {
    if (!window.confirm("Remove this color? Its photos will be deleted too.")) return;
    const removed = variants.find((v) => v.id === id);
    setVariants((prev) => prev.filter((v) => v.id !== id));
    startTransition(async () => {
      try {
        await deleteProductVariant(id, productId);
        toast.success(removed ? `${removed.color_name} removed` : "Color removed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove color");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {variants.map((variant) => (
        <div key={variant.id} className="animate-fade-in rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="size-5 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: variant.color_hex ?? "transparent" }}
              />
              <span className="text-sm text-foreground">{variant.color_name}</span>
              {variant.sku && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {variant.sku}
                </span>
              )}
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

      {availableColors.length > 0 ? (
        <form
          ref={formRef}
          action={addVariant}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="color_name" className="text-xs text-muted-foreground">
              Color
            </label>
            <Select
              name="color_name"
              value={colorName}
              onValueChange={(v) => setColorName(v ?? "")}
              items={colorItems}
              required
            >
              <SelectTrigger id="color_name" className="w-52">
                <SelectValue placeholder="Choose a finish" />
              </SelectTrigger>
              <SelectContent>
                {availableColors.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3.5 shrink-0 rounded-full border border-border"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending || !colorName} variant="outline">
            {pending ? "Adding…" : "Add color"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">All available finishes have been added.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
