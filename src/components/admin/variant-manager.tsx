"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  addProductVariant,
  deleteProductVariant,
  updateProductVariantPrice,
} from "@/lib/actions/admin/variants";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_COLORS } from "@/lib/colors";
import { formatPrice } from "@/lib/format";
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
  const [price, setPrice] = useState("");
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
        setPrice("");
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

  function handlePriceSaved(variantId: string, nextPrice: number | null) {
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, price: nextPrice } : v)));
  }

  return (
    <div className="flex flex-col gap-6">
      {variants.map((variant) => (
        <div key={variant.id} className="animate-fade-in rounded-lg border border-border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
            <div className="flex items-center gap-3">
              <VariantPriceEditor
                productId={productId}
                variantId={variant.id}
                price={variant.price}
                onSaved={(next) => handlePriceSaved(variant.id, next)}
              />
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="variant_price" className="text-xs text-muted-foreground">
              Price (optional)
            </label>
            <Input
              id="variant_price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="On enquiry"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-32"
            />
          </div>
          <Button type="submit" loading={pending} loadingText="Adding…" disabled={!colorName} variant="outline">
            Add color
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">All available finishes have been added.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function VariantPriceEditor({
  productId,
  variantId,
  price,
  onSaved,
}: {
  productId: string;
  variantId: string;
  price: number | null;
  onSaved: (price: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(price != null ? String(price) : "");
  const [pending, startTransition] = useTransition();

  function save() {
    const nextPrice = value.trim() ? Number(value) : null;
    if (nextPrice != null && (Number.isNaN(nextPrice) || nextPrice < 0)) {
      toast.error("Enter a valid price");
      return;
    }
    startTransition(async () => {
      try {
        await updateProductVariantPrice(variantId, productId, nextPrice);
        onSaved(nextPrice);
        setEditing(false);
        toast.success("Price updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update price");
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          step="0.01"
          min="0"
          autoFocus
          placeholder="On enquiry"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 w-24 text-xs"
        />
        <Button type="button" size="xs" loading={pending} loadingText="" onClick={save}>
          Save
        </Button>
        <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(price != null ? String(price) : "");
        setEditing(true);
      }}
      className="flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
    >
      {formatPrice(price)}
      <Pencil className="size-3" />
    </button>
  );
}
