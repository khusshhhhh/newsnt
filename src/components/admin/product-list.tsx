"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteProduct, duplicateProduct, bulkSetPublished } from "@/lib/actions/admin/products";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { departmentCopy, type Department } from "@/lib/department";

export type AdminProductRow = {
  id: string;
  name: string;
  department: Department;
  is_published: boolean;
  is_featured: boolean;
  price: number | null;
  category: { name: string } | null;
  series: { name: string } | null;
  product_images: { storage_path: string; display_order: number }[];
};

export function ProductList({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
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

      <div className="divide-y divide-border rounded-xl border border-border">
        {products.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={selected.size === products.length}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-input"
              aria-label="Select all products"
            />
            Select all
          </div>
        )}
        {products.map((p) => {
          const image = [...(p.product_images ?? [])].sort(
            (a, b) => a.display_order - b.display_order
          )[0];
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 shrink-0 rounded border-input"
                  aria-label={`Select ${p.name}`}
                />
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
                    {!p.is_published && <Badge variant="secondary">Draft</Badge>}
                    {p.is_featured && <Badge>Featured</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.category?.name}
                    {p.series?.name ? ` · ${p.series.name}` : ""} · {formatPrice(p.price)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
            </div>
          );
        })}

        {products.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No products match.</p>
        )}
      </div>
    </div>
  );
}
