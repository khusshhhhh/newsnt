"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateOrderDiscount, updateOrderStatus, updateOrderNotes } from "@/lib/actions/admin/orders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FULL_SCREEN_ON_MOBILE,
} from "@/components/ui/dialog";
import { OrderPaymentPanel, PAYMENT_STATUS_LABEL } from "@/components/admin/order-payment-panel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DiscountField, TotalsSummary } from "@/components/admin/discount-field";
import { departmentCopy } from "@/lib/department";
import { applyDiscount, discountFromRow, discountNote, itemsSubtotal, type Discount } from "@/lib/discount";
import { formatAmount, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORDER_STAGES } from "@/lib/order-stages";
import type { Order, OrderStatus } from "@/lib/supabase/types";

export type OrderWithCustomer = Order & {
  customer: { name: string; email: string; phone: string | null } | null;
};

/** The order's post-discount total — the stored `total`, or re-derived for rows from before it was stored. */
function orderTotal(order: OrderWithCustomer) {
  return order.total != null ? Number(order.total) : applyDiscount(itemsSubtotal(order.items), discountFromRow(order)).total;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/**
 * Orders as a Kanban board (drag cards between stages) or as a list — both
 * share the same optimistic state and detail dialog, so a change made in
 * one view is the same change in the other.
 */
export function OrdersBoard({
  orders: initialOrders,
  view = "board",
}: {
  orders: OrderWithCustomer[];
  view?: "board" | "list";
}) {
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

  function patchOrder(id: string, fields: Partial<OrderWithCustomer>) {
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, ...fields } : o)));
  }

  const detailOrder = orders.find((o) => o.id === detailOrderId) ?? null;

  return (
    <>
      {view === "list" ? (
        <OrdersList orders={orders} onMove={moveOrder} onOpen={setDetailOrderId} />
      ) : (
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {ORDER_STAGES.map((stage) => {
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
      )}

      <Dialog open={detailOrder != null} onOpenChange={(open) => !open && setDetailOrderId(null)}>
        <DialogContent className={cn("sm:max-w-xl", FULL_SCREEN_ON_MOBILE)}>
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

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[480px] text-sm">
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
                {ORDER_STAGES.map((stage) => (
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

              <OrderDiscountPanel
                key={`discount-${detailOrder.id}`}
                order={detailOrder}
                onSaved={(fields) => patchOrder(detailOrder.id, fields)}
              />

              <OrderPaymentPanel
                key={detailOrder.id}
                order={detailOrder}
                total={orderTotal(detailOrder)}
                onSaved={(fields) => patchOrder(detailOrder.id, fields)}
              />

              <OrderNotesField
                key={`notes-${detailOrder.id}`}
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
  const total = orderTotal(order);
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
        "animate-fade-in cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-sm transition-opacity active:cursor-grabbing",
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
          {hasPriced ? ` · ${formatAmount(total)}${discountNote(order)}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px]",
              order.payment_status === "paid" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            )}
          >
            {PAYMENT_STATUS_LABEL[order.payment_status] ?? "Unpaid"}
          </span>
          {order.fulfilment_date && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Due {shortDate(order.fulfilment_date)}
            </span>
          )}
        </div>
      </button>

      <select
        value={order.status}
        onChange={(e) => onMove(e.target.value as OrderStatus)}
        aria-label={`Move ${order.order_number} to a different stage`}
        className="mt-2 h-6 w-full rounded-full border border-border bg-transparent px-1.5 text-[10px] text-muted-foreground"
      >
        {ORDER_STAGES.map((s) => (
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

const LIST_COLUMNS = "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)_3.5rem_7.5rem_9rem_7rem_4.5rem]";

function OrdersList({
  orders,
  onMove,
  onOpen,
}: {
  orders: OrderWithCustomer[];
  onMove: (id: string, status: OrderStatus) => void;
  onOpen: (id: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No orders match.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Column headings — below md each row stacks into a compact card instead. */}
      <div
        className={cn(
          "hidden items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid",
          LIST_COLUMNS
        )}
      >
        <span>Order</span>
        <span>Customer</span>
        <span className="text-right">Items</span>
        <span className="text-right">Total</span>
        <span>Stage</span>
        <span>Payment</span>
        <span className="text-right">Due</span>
      </div>
      <ul className="divide-y divide-border">
        {orders.map((order) => {
          const hasPriced = order.items.some((i) => i.unitPrice != null);
          const totalText = hasPriced ? formatAmount(orderTotal(order)) : "—";
          return (
            <li
              key={order.id}
              className={cn(
                "animate-fade-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/30",
                LIST_COLUMNS
              )}
            >
              <button type="button" onClick={() => onOpen(order.id)} data-admin-row className="min-w-0 text-left">
                <span className="block truncate text-sm text-foreground hover:underline">{order.order_number}</span>
                <span className="block text-xs text-muted-foreground">{shortDate(order.created_at)}</span>
              </button>
              <span className="text-right text-sm font-medium tabular-nums text-foreground md:hidden">{totalText}</span>

              <div className="col-span-2 min-w-0 md:col-span-1">
                <p className="truncate text-sm text-foreground">{order.customer?.name ?? "—"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.customer?.email ?? ""}
                  <span className="md:hidden">
                    {" "}
                    · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </span>
                </p>
              </div>

              <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
                {order.items.length}
              </span>
              <span className="hidden text-right text-sm tabular-nums text-foreground md:block">
                {totalText}
                {discountFromRow(order) && (
                  <span className="block text-[11px] text-muted-foreground">{discountNote(order).trim()}</span>
                )}
              </span>

              <select
                value={order.status}
                onChange={(e) => onMove(order.id, e.target.value as OrderStatus)}
                aria-label={`Stage for ${order.order_number}`}
                className="h-7 w-fit rounded-full border border-border bg-transparent px-2 text-xs text-foreground"
              >
                {ORDER_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center justify-end gap-1.5 md:contents">
                <span
                  className={cn(
                    "w-fit rounded-full px-2 py-0.5 text-[11px]",
                    order.payment_status === "paid" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  )}
                >
                  {PAYMENT_STATUS_LABEL[order.payment_status] ?? "Unpaid"}
                </span>
                <span className="text-xs text-muted-foreground md:text-right">
                  {order.fulfilment_date ? (
                    <>
                      <span className="md:hidden">Due </span>
                      {shortDate(order.fulfilment_date)}
                    </>
                  ) : (
                    <span className="hidden md:inline">—</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Subtotal → discount → total for an order, with the discount editable after the order was created. */
function OrderDiscountPanel({
  order,
  onSaved,
}: {
  order: OrderWithCustomer;
  onSaved: (fields: Partial<OrderWithCustomer>) => void;
}) {
  const saved = discountFromRow(order);
  const [discount, setDiscount] = useState<Discount | null>(saved);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const subtotal = itemsSubtotal(order.items);
  const priced = order.items.some((i) => i.unitPrice != null);

  function save() {
    startTransition(async () => {
      try {
        const next = await updateOrderDiscount(order.id, discount);
        onSaved(next);
        setEditing(false);
        toast.success(discount ? "Discount saved" : "Discount removed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save the discount");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <TotalsSummary subtotal={subtotal} discount={editing ? discount : saved} priced={priced} />
      {editing ? (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border/60 p-3">
          <DiscountField id={`order-discount-${order.id}`} subtotal={subtotal} discount={discount} onChange={setDiscount} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDiscount(saved);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" loading={pending} loadingText="Saving…" onClick={save}>
              Save discount
            </Button>
          </div>
        </div>
      ) : (
        priced && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {saved ? "Change discount" : "Add a discount"}
          </button>
        )
      )}
    </div>
  );
}
