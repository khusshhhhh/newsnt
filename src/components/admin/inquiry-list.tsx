"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { markInquiryStatus } from "@/lib/actions/admin/inquiries";
import { QuoteDialog } from "@/components/admin/quote-dialog";
import { productHref, departmentCopy, type Department } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import type { Inquiry, InquiryStatus } from "@/lib/supabase/types";

export type AdminInquiryProductVariant = {
  id: string;
  color_name: string;
  sku: string | null;
  price: number | null;
};

export type AdminInquiryProduct = {
  id: string;
  name: string;
  slug: string;
  department: Department;
  sku: string | null;
  price: number | null;
  series: { name: string } | null;
  category: { name: string } | null;
  product_images: { storage_path: string; display_order: number }[];
  variants: AdminInquiryProductVariant[];
};

export type ResolvedInquiryLine = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  seriesName: string | null;
  categoryName: string | null;
  department: Department;
  slug: string;
  imagePath: string | null;
  quantity: number;
  unitPrice: number | null;
};

const STATUSES: InquiryStatus[] = ["new", "contacted", "closed"];

function resolveInquiryLines(
  inquiry: Inquiry,
  productsById: Map<string, AdminInquiryProduct>
): ResolvedInquiryLine[] {
  function toLine(
    product: AdminInquiryProduct,
    variantId: string | null,
    quantity: number
  ): ResolvedInquiryLine {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
    const image = [...product.product_images].sort((a, b) => a.display_order - b.display_order)[0];
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantLabel: variant?.color_name ?? null,
      sku: variant?.sku ?? product.sku,
      seriesName: product.series?.name ?? null,
      categoryName: product.category?.name ?? null,
      department: product.department,
      slug: product.slug,
      imagePath: image?.storage_path ?? null,
      quantity,
      unitPrice: variant?.price ?? product.price,
    };
  }

  if (inquiry.items && inquiry.items.length > 0) {
    return inquiry.items
      .map((item) => {
        const product = productsById.get(item.product_id);
        return product ? toLine(product, item.variant_id, item.quantity) : null;
      })
      .filter((line): line is ResolvedInquiryLine => line !== null);
  }

  // Legacy rows submitted before `items` existed only have `product_ids`
  // (a bare id repeated once per unit, no variant) — tally occurrences
  // back into a quantity per product.
  const quantitiesById = new Map<string, number>();
  for (const id of inquiry.product_ids ?? []) {
    quantitiesById.set(id, (quantitiesById.get(id) ?? 0) + 1);
  }
  return Array.from(quantitiesById.entries())
    .map(([id, quantity]) => {
      const product = productsById.get(id);
      return product ? toLine(product, null, quantity) : null;
    })
    .filter((line): line is ResolvedInquiryLine => line !== null);
}

export function InquiryList({
  inquiries,
  products,
}: {
  inquiries: Inquiry[];
  products: AdminInquiryProduct[];
}) {
  const productsById = new Map(products.map((p) => [p.id, p]));

  if (inquiries.length === 0) {
    return <p className="text-sm text-muted-foreground">No inquiries here yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {inquiries.map((inquiry) => (
        <InquiryRow key={inquiry.id} inquiry={inquiry} lines={resolveInquiryLines(inquiry, productsById)} />
      ))}
    </ul>
  );
}

function InquiryRow({ inquiry, lines }: { inquiry: Inquiry; lines: ResolvedInquiryLine[] }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(status: InquiryStatus) {
    startTransition(async () => {
      try {
        await markInquiryStatus(inquiry.id, status);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  const hasPricedLine = lines.some((l) => l.unitPrice != null);
  const total = lines.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.quantity, 0);

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading text-base text-foreground">{inquiry.name}</p>
          <p className="text-sm text-muted-foreground">
            {inquiry.email}
            {inquiry.phone ? ` · ${inquiry.phone}` : ""}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {departmentCopy(inquiry.department).label} ·{" "}
            {new Date(inquiry.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1 text-xs">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={() => setStatus(status)}
              className={cn(
                "rounded-full px-2.5 py-1 capitalize transition-colors disabled:opacity-50",
                inquiry.status === status
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{inquiry.message}</p>

      {lines.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Series</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {lines.map((line, i) => (
                <tr key={`${line.productId}-${line.variantId ?? "base"}-${i}`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card">
                        {line.imagePath && (
                          <Image
                            src={mediaUrl(line.imagePath)}
                            alt=""
                            fill
                            className="object-contain p-1"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={productHref(line)}
                          target="_blank"
                          className="block truncate text-foreground hover:underline"
                        >
                          {line.name}
                        </Link>
                        {line.variantLabel && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {line.variantLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{line.seriesName ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{line.sku ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{line.quantity}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatPrice(line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/40 px-3 py-2 text-sm">
            <span className="text-xs text-muted-foreground">
              {lines.length} product{lines.length === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-foreground">
              {formatPrice(hasPricedLine ? total : null)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <QuoteDialog
          inquiryId={inquiry.id}
          customerName={inquiry.name}
          customerEmail={inquiry.email}
          lines={lines}
        />
      </div>
    </li>
  );
}
