"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, ExternalLink, Loader2, Pencil, Rows3, Rows4 } from "lucide-react";
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
  bulkSetCategory,
  bulkSetStockStatus,
  restoreProducts,
  trashProducts,
  updateProductPrice,
  updateProductStockStatus,
  updateProductFeatured,
} from "@/lib/actions/admin/products";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { departmentCopy, productHref, type Department } from "@/lib/department";
import type { ProductSort } from "@/lib/product-sorts";
import { cn } from "@/lib/utils";
import { STOCK_STATUS_LABEL, STOCK_STATUSES } from "@/lib/stock-status";
import type { StockStatus } from "@/lib/supabase/types";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  department: Department;
  is_published: boolean;
  is_featured: boolean;
  price: number | null;
  stock_status: StockStatus;
  category: { name: string } | null;
  series: { name: string } | null;
  product_images: { storage_path: string; display_order: number }[];
};

const DENSITY_KEY = "admin-product-density";

export function ProductList({
  products: initialProducts,
  sort,
  sortHrefs,
  categories,
  hasFilters,
}: {
  products: AdminProductRow[];
  sort: ProductSort;
  sortHrefs: Record<ProductSort, string>;
  categories: { id: string; name: string; department: Department }[];
  hasFilters: boolean;
}) {
  const router = useRouter();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read a per-browser preference once after hydration
      setCompact(localStorage.getItem(DENSITY_KEY) === "compact");
    } catch {}
  }, []);
  function toggleDensity() {
    setCompact((c) => {
      try {
        localStorage.setItem(DENSITY_KEY, c ? "comfortable" : "compact");
      } catch {}
      return !c;
    });
  }
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

  const selectedDepartments = new Set(products.filter((p) => selected.has(p.id)).map((p) => p.department));
  const movableCategories =
    selectedDepartments.size === 1 ? categories.filter((c) => selectedDepartments.has(c.department)) : [];

  function runBulkAction(run: () => Promise<void>, done: string, patchRows?: (p: AdminProductRow) => AdminProductRow) {
    const ids = Array.from(selected);
    startBulkTransition(async () => {
      try {
        await run();
        if (patchRows) setProducts((prev) => prev.map((p) => (ids.includes(p.id) ? patchRows(p) : p)));
        toast.success(done);
        setSelected(new Set());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bulk update failed");
      }
    });
  }

  function bulkTrash() {
    const ids = Array.from(selected);
    if (!window.confirm(`Move ${ids.length} product${ids.length === 1 ? "" : "s"} to trash? You can restore them from Trash.`)) return;
    startBulkTransition(async () => {
      try {
        await trashProducts(ids);
        setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelected(new Set());
        toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} moved to trash`, {
          action: {
            label: "Undo",
            onClick: () => {
              restoreProducts(ids)
                .then(() => {
                  toast.success("Restored as drafts");
                  router.refresh();
                })
                .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't restore"));
            },
          },
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to move to trash");
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
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <span className="text-sm text-foreground">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
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
            <select
              aria-label="Set stock status for selected products"
              disabled={bulkPending}
              value=""
              onChange={(e) => {
                const next = e.target.value as StockStatus;
                if (!next) return;
                runBulkAction(
                  () => bulkSetStockStatus(Array.from(selected), next),
                  `Stock set to ${STOCK_STATUS_LABEL[next]}`,
                  (p) => ({ ...p, stock_status: next })
                );
              }}
              className="h-8 rounded-md border border-border bg-transparent px-2 text-xs"
            >
              <option value="">Set stock…</option>
              {STOCK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STOCK_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Move selected products to a category"
              disabled={bulkPending || movableCategories.length === 0}
              title={movableCategories.length === 0 ? "Select products from a single department to move them" : undefined}
              value=""
              onChange={(e) => {
                const category = movableCategories.find((c) => c.id === e.target.value);
                if (!category) return;
                runBulkAction(
                  () => bulkSetCategory(Array.from(selected), category.id),
                  `Moved to ${category.name}`,
                  (p) => ({ ...p, category: { name: category.name } })
                );
              }}
              className="h-8 rounded-md border border-border bg-transparent px-2 text-xs disabled:opacity-50"
            >
              <option value="">Move to category…</option>
              {movableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={bulkPending}
              className="text-destructive hover:text-destructive"
              onClick={bulkTrash}
            >
              Move to trash
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="mb-2 flex justify-end">
        <Button type="button" variant="ghost" size="xs" className="gap-1.5 text-muted-foreground" onClick={toggleDensity}>
          {compact ? <Rows3 className="size-3.5" /> : <Rows4 className="size-3.5" />}
          {compact ? "Comfortable rows" : "Compact rows"}
        </Button>
      </div>
      <div className={cn("rounded-xl border border-border", compact && "[&_td]:py-1 [&_th]:h-8")}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
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
              <TableHead>
                <SortLink label="Product" asc="name-asc" desc="name-desc" sort={sort} hrefs={sortHrefs} />
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <SortLink label="Price" asc="price-asc" desc="price-desc" sort={sort} hrefs={sortHrefs} />
              </TableHead>
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
                      <div
                        className={cn(
                          "relative shrink-0 overflow-hidden rounded-md border border-border/60 bg-card",
                          compact ? "size-7" : "size-11"
                        )}
                      >
                        {image && (
                          <Image
                            src={mediaUrl(image.storage_path)}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-contain p-1.5"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            data-admin-row
                            className="truncate text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
                          >
                            {p.name}
                          </Link>
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
                      {p.is_published && (
                        <a
                          href={productHref(p)}
                          target="_blank"
                          rel="noreferrer"
                          title="View on site"
                          aria-label={`View ${p.name} on the site`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                        >
                          <ExternalLink />
                        </a>
                      )}
                      <Link
                        href={`/admin/products/${p.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        action={async () => {
                          await deleteProduct(p.id);
                          setProducts((prev) => prev.filter((row) => row.id !== p.id));
                        }}
                        undo={async () => {
                          await restoreProducts([p.id]);
                          router.refresh();
                        }}
                        label="Delete product"
                        itemName={p.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {products.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {hasFilters ? (
              <>
                No products match these filters.{" "}
                <Link href="/admin/products" className="text-foreground underline underline-offset-4">
                  Clear filters
                </Link>
              </>
            ) : (
              <>
                No products yet.{" "}
                <Link href="/admin/products/new" className="text-foreground underline underline-offset-4">
                  Add your first product
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SortLink({
  label,
  asc,
  desc,
  sort,
  hrefs,
}: {
  label: string;
  asc: ProductSort;
  desc: ProductSort;
  sort: ProductSort;
  hrefs: Record<ProductSort, string>;
}) {
  const active = sort === asc || sort === desc;
  const next = sort === asc ? desc : asc;
  const Icon = !active ? ArrowUpDown : sort === asc ? ArrowUp : ArrowDown;
  return (
    <Link
      href={hrefs[next]}
      scroll={false}
      aria-label={`Sort by ${label.toLowerCase()}`}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
    >
      {label}
      <Icon className="size-3" />
    </Link>
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
