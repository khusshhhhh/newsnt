"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  deleteProduct,
  duplicateProduct,
  bulkSetPublished,
  updateProductPrice,
  updateProductStockStatus,
  updateProductFeatured,
} from "@/lib/actions/admin/products";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { departmentCopy, type Department } from "@/lib/department";
import { STOCK_STATUS_LABEL, STOCK_STATUSES } from "@/lib/stock-status";
import type { StockStatus } from "@/lib/supabase/types";

export type AdminProductRow = {
  id: string;
  name: string;
  department: Department;
  is_published: boolean;
  is_featured: boolean;
  price: number | null;
  stock_status: StockStatus;
  category: { name: string } | null;
  series: { name: string } | null;
  product_images: { storage_path: string; display_order: number }[];
};

export function ProductList({ products: initialProducts }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  // Filters/search change the `products` prop via a new server render — reset
  // local state (which also carries optimistic inline edits) whenever that
  // happens, tracked by comparing against the prop seen on the last render.
  const [syncedProducts, setSyncedProducts] = useState(initialProducts);
  if (initialProducts !== syncedProducts) {
    setSyncedProducts(initialProducts);
    setProducts(initialProducts);
  }
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulkTransition] = useTransition();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))
    );
  }

  function runBulk(isPublished: boolean) {
    const ids = Array.from(selected);
    startBulkTransition(async () => {
      try {
        await bulkSetPublished(ids, isPublished);
        setProducts((prev) =>
          prev.map((p) => (ids.includes(p.id) ? { ...p, is_published: isPublished } : p))
        );
        toast.success(
          `${ids.length} product${ids.length === 1 ? "" : "s"} ${isPublished ? "published" : "unpublished"}`
        );
        setSelected(new Set());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bulk update failed");
      }
    });
  }

  function duplicate(id: string) {
    setDuplicatingId(id);
    startBulkTransition(async () => {
      try {
        const newId = await duplicateProduct(id);
        toast.success("Product duplicated");
        router.push(`/admin/products/${newId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to duplicate");
      } finally {
        setDuplicatingId(null);
      }
    });
  }

  function patch(id: string, changes: Partial<AdminProductRow>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <span className="text-sm text-foreground">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={bulkPending}
              loadingText="Publishing…"
              onClick={() => runBulk(true)}
            >
              Publish
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={bulkPending}
              loadingText="Unpublishing…"
              onClick={() => runBulk(false)}
            >
              Unpublish
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                {products.length > 0 && (
                  <input
                    type="checkbox"
                    checked={selected.size === products.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input"
                    aria-label="Select all products"
                  />
                )}
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const image = [...(p.product_images ?? [])].sort(
                (a, b) => a.display_order - b.display_order
              )[0];
              return (
                <TableRow key={p.id} className="animate-fade-in">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 rounded border-input"
                      aria-label={`Select ${p.name}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card">
                        {image && (
                          <Image
                            src={mediaUrl(image.storage_path)}
                            alt=""
                            fill
                            className="object-contain p-1.5"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-foreground">{p.name}</span>
                          <Badge variant="secondary" className="shrink-0">
                            {departmentCopy(p.department).shortLabel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.category?.name}
                    {p.series?.name ? ` · ${p.series.name}` : ""}
                  </TableCell>
                  <TableCell>
                    <ProductPriceCell
                      productId={p.id}
                      price={p.price}
                      onSaved={(price) => patch(p.id, { price })}
                    />
                  </TableCell>
                  <TableCell>
                    <ProductStockCell
                      productId={p.id}
                      stockStatus={p.stock_status}
                      onSaved={(stock_status) => patch(p.id, { stock_status })}
                    />
                  </TableCell>
                  <TableCell>
                    <ProductBooleanCell
                      label={`Published — ${p.name}`}
                      checked={p.is_published}
                      onToggle={async (next) => {
                        await bulkSetPublished([p.id], next);
                        patch(p.id, { is_published: next });
                        toast.success(next ? "Product published" : "Moved to draft");
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <ProductBooleanCell
                      label={`Featured — ${p.name}`}
                      checked={p.is_featured}
                      onToggle={async (next) => {
                        await updateProductFeatured(p.id, next);
                        patch(p.id, { is_featured: next });
                        toast.success(next ? "Marked as featured" : "Removed from featured");
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex shrink-0 items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Duplicate product"
                        aria-label="Duplicate product"
                        disabled={duplicatingId === p.id}
                        onClick={() => duplicate(p.id)}
                      >
                        {duplicatingId === p.id ? <Loader2 className="animate-spin" /> : <Copy />}
                      </Button>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Edit
                      </Link>
                      <DeleteButton action={deleteProduct.bind(null, p.id)} label="Delete product" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {products.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No products match.</p>
        )}
      </div>
    </div>
  );
}

function ProductPriceCell({
  productId,
  price,
  onSaved,
}: {
  productId: string;
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
        await updateProductPrice(productId, nextPrice);
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
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
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

function ProductStockCell({
  productId,
  stockStatus,
  onSaved,
}: {
  productId: string;
  stockStatus: StockStatus;
  onSaved: (status: StockStatus) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    const next = value as StockStatus;
    startTransition(async () => {
      try {
        await updateProductStockStatus(productId, next);
        onSaved(next);
        toast.success("Stock status updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update stock status");
      }
    });
  }

  return (
    <select
      aria-label="Stock status"
      value={stockStatus}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="h-7 rounded-full border border-border bg-transparent px-2 text-xs text-muted-foreground disabled:opacity-50"
    >
      {STOCK_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STOCK_STATUS_LABEL[status]}
        </option>
      ))}
    </select>
  );
}

function ProductBooleanCell({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      try {
        await onToggle(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={pending}
      onChange={(e) => handleChange(e.target.checked)}
      className="h-4 w-4 rounded border-input disabled:opacity-50"
    />
  );
}
