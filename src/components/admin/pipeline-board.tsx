"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { markInquiryStatus } from "@/lib/actions/admin/inquiries";
import { OrderDialog } from "@/components/admin/order-dialog";
import { editableLinesFromResolved, lineItemsTotal } from "@/components/admin/line-item-editor";
import { resolveInquiryLines, type AdminInquiryProduct } from "@/lib/inquiry-lines";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Inquiry, InquiryStatus } from "@/lib/supabase/types";

const STAGES: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

/**
 * A Kanban view of the deal pipeline: one column per stage, cards
 * draggable between them (native HTML5 DnD — no extra dependency for a
 * feature this size), with a per-card stage <select> as the accessible/
 * touch fallback for the same move.
 */
export function PipelineBoard({
  inquiries: initialInquiries,
  products,
}: {
  inquiries: Inquiry[];
  products: AdminInquiryProduct[];
}) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [dragOverStage, setDragOverStage] = useState<InquiryStatus | null>(null);
  const [, startTransition] = useTransition();
  const productsById = new Map(products.map((p) => [p.id, p]));

  function moveInquiry(id: string, status: InquiryStatus) {
    const previous = inquiries;
    if (previous.find((i) => i.id === id)?.status === status) return;
    setInquiries((cur) => cur.map((i) => (i.id === id ? { ...i, status } : i)));
    startTransition(async () => {
      try {
        await markInquiryStatus(id, status);
      } catch (e) {
        setInquiries(previous);
        toast.error(e instanceof Error ? e.message : "Failed to move");
      }
    });
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
      {STAGES.map((stage) => {
        const items = inquiries.filter((i) => i.status === stage.value);
        return (
          <div
            key={stage.value}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.value);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage.value ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverStage(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) moveInquiry(id, stage.value);
            }}
            className={cn(
              "flex min-h-[120px] w-[82vw] shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2 transition-colors sm:w-72 lg:w-auto lg:shrink",
              dragOverStage === stage.value && "border-foreground/40 bg-muted/40"
            )}
          >
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stage.label}
              </span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((inquiry) => (
                <PipelineCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  lines={resolveInquiryLines(inquiry, productsById)}
                  onMove={(status) => moveInquiry(inquiry.id, status)}
                />
              ))}
              {items.length === 0 && (
                <p className="px-1 py-3 text-center text-xs text-muted-foreground">No deals</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({
  inquiry,
  lines,
  onMove,
}: {
  inquiry: Inquiry;
  lines: ReturnType<typeof resolveInquiryLines>;
  onMove: (status: InquiryStatus) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const editableLines = editableLinesFromResolved(lines);
  const { hasPricedLine, total } = lineItemsTotal(editableLines);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", inquiry.id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "animate-fade-in cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-sm transition-opacity active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {inquiry.customer_id ? (
          <Link
            href={`/admin/customers/${inquiry.customer_id}`}
            className="truncate text-sm text-foreground hover:underline"
          >
            {inquiry.name}
          </Link>
        ) : (
          <span className="truncate text-sm text-foreground">{inquiry.name}</span>
        )}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {new Date(inquiry.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="truncate text-xs text-muted-foreground">{inquiry.email}</p>
      {lines.length > 0 && (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {lines.length} product{lines.length === 1 ? "" : "s"}
          {hasPricedLine ? ` · ${formatPrice(total)}` : ""}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-1.5">
        <select
          value={inquiry.status}
          onChange={(e) => onMove(e.target.value as InquiryStatus)}
          aria-label={`Move ${inquiry.name} to a different stage`}
          className="h-6 min-w-0 rounded-full border border-border bg-transparent px-1.5 text-[10px] text-muted-foreground"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {inquiry.status === "won" && inquiry.customer_id && lines.length > 0 && (
          <OrderDialog
            customerId={inquiry.customer_id}
            customerName={inquiry.name}
            department={inquiry.department}
            inquiryId={inquiry.id}
            lines={editableLines}
            triggerLabel="Order"
          />
        )}
      </div>
    </div>
  );
}
