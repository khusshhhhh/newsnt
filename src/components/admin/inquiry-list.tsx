"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { markInquiryStatus } from "@/lib/actions/admin/inquiries";
import { productHref, departmentCopy, type Department } from "@/lib/department";
import { cn } from "@/lib/utils";
import type { Inquiry, InquiryStatus } from "@/lib/supabase/types";

type ProductRef = { id: string; name: string; slug: string; department: Department };

const STATUSES: InquiryStatus[] = ["new", "contacted", "closed"];

export function InquiryList({
  inquiries,
  products,
}: {
  inquiries: Inquiry[];
  products: ProductRef[];
}) {
  const productsById = new Map(products.map((p) => [p.id, p]));

  if (inquiries.length === 0) {
    return <p className="text-sm text-muted-foreground">No inquiries here yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {inquiries.map((inquiry) => (
        <InquiryRow key={inquiry.id} inquiry={inquiry} productsById={productsById} />
      ))}
    </ul>
  );
}

function InquiryRow({
  inquiry,
  productsById,
}: {
  inquiry: Inquiry;
  productsById: Map<string, ProductRef>;
}) {
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

  const referencedProducts = (inquiry.product_ids ?? [])
    .map((id) => productsById.get(id))
    .filter((p): p is ProductRef => Boolean(p));

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

      {referencedProducts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {referencedProducts.map((p) => (
            <Link
              key={p.id}
              href={productHref(p)}
              target="_blank"
              className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}
