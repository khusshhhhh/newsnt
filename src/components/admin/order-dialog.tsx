"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LineItemEditor,
  includedLines,
  toQuoteLineItems,
  type EditableLine,
} from "@/components/admin/line-item-editor";
import { createOrder } from "@/lib/actions/admin/orders";
import { cn } from "@/lib/utils";
import type { Department } from "@/lib/department";

/** Reviews a quote's (or inquiry's) line items and creates an order from them — used from a customer's quote history or a "Won" pipeline card. */
export function OrderDialog({
  customerId,
  customerName,
  department,
  quoteId,
  inquiryId,
  lines: initialLines,
  triggerLabel = "Convert to order",
  onCreated,
}: {
  customerId: string;
  customerName: string;
  department: Department;
  quoteId?: string | null;
  inquiryId?: string | null;
  lines: EditableLine[];
  triggerLabel?: string;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<EditableLine[]>(initialLines);
  const [notes, setNotes] = useState("");
  const [creating, startCreate] = useTransition();

  function handleCreate() {
    if (includedLines(lines).length === 0) {
      toast.error("Include at least one product");
      return;
    }
    startCreate(async () => {
      try {
        const order = await createOrder({
          customerId,
          department,
          quoteId: quoteId ?? null,
          inquiryId: inquiryId ?? null,
          items: toQuoteLineItems(lines),
          notes,
        });
        toast.success(`Order ${order.order_number} created`);
        setOpen(false);
        onCreated?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create order");
      }
    });
  }

  if (initialLines.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setLines(initialLines);
          setNotes("");
        }
      }}
    >
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <Package className="size-3.5" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create order for {customerName}</DialogTitle>
          <DialogDescription>
            Confirm what&apos;s being ordered before it goes to fulfillment.
          </DialogDescription>
        </DialogHeader>

        <LineItemEditor lines={lines} onChange={setLines} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-notes">Internal notes (optional)</Label>
          <Textarea
            id="order-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. delivery address, special instructions…"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            loading={creating}
            loadingText="Creating…"
            onClick={handleCreate}
            className="gap-1.5"
          >
            <Package className="size-4" />
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
