"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { downloadOrderDocument, updateOrderPayment } from "@/lib/actions/admin/orders";
import { downloadBase64File } from "@/lib/download-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import type { Order, PaymentStatus } from "@/lib/supabase/types";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit paid",
  paid: "Paid",
  refunded: "Refunded",
};

type PaymentFields = Pick<Order, "payment_status" | "deposit_amount" | "amount_paid" | "fulfilment_date">;

/** Payment + fulfilment details and document downloads inside the order detail dialog. */
export function OrderPaymentPanel({
  order,
  total,
  onSaved,
}: {
  order: Order;
  total: number;
  onSaved: (fields: PaymentFields) => void;
}) {
  const [status, setStatus] = useState<PaymentStatus>(order.payment_status);
  const [deposit, setDeposit] = useState(order.deposit_amount != null ? String(order.deposit_amount) : "");
  const [paid, setPaid] = useState(String(order.amount_paid ?? 0));
  const [date, setDate] = useState(order.fulfilment_date ?? "");
  const [saving, startSave] = useTransition();
  const [downloading, setDownloading] = useState<"invoice" | "packing-slip" | null>(null);

  const balance = Math.max(0, total - (Number(paid) || 0));

  function save() {
    const fields = {
      paymentStatus: status,
      depositAmount: deposit.trim() ? Number(deposit) : null,
      amountPaid: Number(paid) || 0,
      fulfilmentDate: date || null,
    };
    if ([fields.depositAmount ?? 0, fields.amountPaid].some((n) => Number.isNaN(n) || n < 0)) {
      toast.error("Enter valid amounts");
      return;
    }
    startSave(async () => {
      try {
        await updateOrderPayment(order.id, fields);
        onSaved({
          payment_status: fields.paymentStatus,
          deposit_amount: fields.depositAmount,
          amount_paid: fields.amountPaid,
          fulfilment_date: fields.fulfilmentDate,
        });
        toast.success("Payment details saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  async function download(kind: "invoice" | "packing-slip") {
    setDownloading(kind);
    try {
      const { filename, base64 } = await downloadOrderDocument(order.id, kind);
      downloadBase64File(filename, base64, "application/pdf");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create the PDF");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Payment & delivery</span>
        <span className="text-xs text-muted-foreground">
          Total {formatPrice(total)} · Balance {formatPrice(balance)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`pay-status-${order.id}`} className="text-xs">Status</Label>
          <select
            id={`pay-status-${order.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`deposit-${order.id}`} className="text-xs">Deposit</Label>
          <Input id={`deposit-${order.id}`} type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`paid-${order.id}`} className="text-xs">Paid so far</Label>
          <Input id={`paid-${order.id}`} type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} className="h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`date-${order.id}`} className="text-xs">Delivery date</Label>
          <Input id={`date-${order.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["invoice", "packing-slip"] as const).map((kind) => (
            <Button key={kind} type="button" variant="outline" size="sm" className="gap-1.5" disabled={downloading != null} onClick={() => download(kind)}>
              {downloading === kind ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
              {kind === "invoice" ? "Invoice" : "Packing slip"}
            </Button>
          ))}
        </div>
        <Button type="button" size="sm" loading={saving} loadingText="Saving…" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
