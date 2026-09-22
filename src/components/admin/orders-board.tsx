"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateOrderStatus, updateOrderNotes } from "@/lib/actions/admin/orders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { departmentCopy } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/supabase/types";

export type OrderWithCustomer = Order & {
  customer: { name: string; email: string; phone: string | null } | null;
};

const STAGES: { value: OrderStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_production", label: "In production" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersBoard({ orders: initialOrders }: { orders: OrderWithCustomer[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [dragOverStage, setDragOverStage] = useState<OrderStatus | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function moveOrder(id: string, status: OrderStatus) {
    const previous = orders;
    if (previous.find((o) => o.id === id)?.status === status) return;
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status } : o)));
    startTransition(async () => {
      try {
        await updateOrderStatus(id, status);
      } catch (e) {
        setOrders(previous);
        toast.error(e instanceof Error ? e.message : "Failed to move order");
      }
    });
  }

  function patchNotes(id: string, notes: string) {
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, notes } : o)));
  }

  const detailOrder = orders.find((o) => o.id === detailOrderId) ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const items = orders.filter((o) => o.status === stage.value);
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
                if (id) moveOrder(id, stage.value);
              }}
              className={cn(
                "flex min-h-[120px] flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2 transition-colors",
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
                {items.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMove={(status) => moveOrder(order.id, status)}
                    onOpen={() => setDetailOrderId(order.id)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="px-1 py-3 text-center text-xs text-muted-foreground">No orders</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={detailOrder != null} onOpenChange={(open) => !open && setDetailOrderId(null)}>
        <DialogContent className="sm:max-w-xl">
          {detailOrder && (
            <>
              <DialogHeader>
                <DialogTitle>{detailOrder.order_number}</DialogTitle>
                <DialogDescription>
                  {detailOrder.customer ? (
                    <Link href={`/admin/customers/${detailOrder.customer_id}`} className="hover:underline">
                      {detailOrder.customer.name} · {detailOrder.customer.email}
                    </Link>
                  ) : (
                    "Customer"
                  )}{" "}
                  · {departmentCopy(detailOrder.department).label}
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-hidden rounded-lg border border-border/60">
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
                    {detailOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-foreground">
                          {item.name}
                          {item.variantLabel && (
                            <span className="block text-xs text-muted-foreground">
                              {item.variantLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{item.seriesName ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.sku ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatPrice(item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-1 rounded-full border border-border p-1 text-xs w-fit">
                {STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    type="button"
                    onClick={() => moveOrder(detailOrder.id, stage.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 transition-colors",
                      detailOrder.status === stage.value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>

              <OrderNotesField
                orderId={detailOrder.id}
                notes={detailOrder.notes}
                onSaved={(notes) => patchNotes(detailOrder.id, notes)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderCard({
  order,
  onMove,
  onOpen,
}: {
  order: OrderWithCustomer;
  onMove: (status: OrderStatus) => void;
  onOpen: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const total = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0);
  const hasPriced = order.items.some((i) => i.unitPrice != null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", order.id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-sm transition-opacity active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-foreground">{order.order_number}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{order.customer?.name ?? "—"}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {order.items.length} item{order.items.length === 1 ? "" : "s"}
          {hasPriced ? ` · ${formatPrice(total)}` : ""}
        </p>
      </button>

      <select
        value={order.status}
        onChange={(e) => onMove(e.target.value as OrderStatus)}
        aria-label={`Move ${order.order_number} to a different stage`}
        className="mt-2 h-6 w-full rounded-full border border-border bg-transparent px-1.5 text-[10px] text-muted-foreground"
      >
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function OrderNotesField({
  orderId,
  notes,
  onSaved,
}: {
  orderId: string;
  notes: string | null;
  onSaved: (notes: string) => void;
}) {
  const [value, setValue] = useState(notes ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (value === (notes ?? "")) return;
    startTransition(async () => {
      try {
        await updateOrderNotes(orderId, value);
        onSaved(value);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save notes");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="order-notes" className="text-sm text-foreground">
        Notes
      </label>
      <Textarea
        id="order-notes"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Delivery address, special instructions…"
      />
      {pending && <span className="text-xs text-muted-foreground">Saving…</span>}
    </div>
  );
}
