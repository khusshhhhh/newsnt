"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { markInquiryStatus } from "@/lib/actions/admin/inquiries";
import { QuoteDialog } from "@/components/admin/quote-dialog";
import { TrashInquiryButton } from "@/components/admin/trash-inquiry-button";
import { productHref, departmentCopy } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import {
  resolveInquiryLines,
  type AdminInquiryProduct,
  type AdminInquiryProductVariant,
  type ResolvedInquiryLine,
} from "@/lib/inquiry-lines";
import type { Inquiry, InquiryStatus } from "@/lib/supabase/types";

export type { AdminInquiryProductVariant, AdminInquiryProduct, ResolvedInquiryLine };

const STATUSES: InquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];

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
    <li className="animate-fade-in rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-heading text-base text-foreground">{inquiry.name}</p>
            {inquiry.customer_id && (
              <Link
                href={`/admin/customers/${inquiry.customer_id}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                View customer
              </Link>
            )}
          </div>
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
                            sizes="48px"
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

      <div className="mt-3 flex justify-end gap-2">
        <QuoteDialog
          inquiryId={inquiry.id}
          customerName={inquiry.name}
          customerEmail={inquiry.email}
          lines={lines}
        />
        <TrashInquiryButton inquiryId={inquiry.id} />
      </div>
    </li>
  );
}
