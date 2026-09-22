"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileDown, FileText, Send } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { previewQuotePdf, sendQuotePdf } from "@/lib/actions/admin/quotes";
import { formatPrice } from "@/lib/format";
import { downloadBase64File } from "@/lib/download-file";
import { cn } from "@/lib/utils";
import type { ResolvedInquiryLine } from "@/lib/inquiry-lines";

type EditableLine = {
  key: string;
  include: boolean;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  seriesName: string | null;
  quantity: number;
  unitPrice: number | null;
};

function toEditableLines(lines: ResolvedInquiryLine[]): EditableLine[] {
  return lines.map((line, i) => ({
    key: `${line.productId}-${line.variantId ?? "base"}-${i}`,
    include: true,
    name: line.name,
    variantLabel: line.variantLabel,
    sku: line.sku,
    seriesName: line.seriesName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }));
}

/**
 * Lets an admin review/adjust the products an inquiry referenced (quantity,
 * price per line, which lines to actually quote), then either download the
 * resulting PDF or email it straight to the customer's own address.
 */
export function QuoteDialog({
  inquiryId,
  customerName,
  customerEmail,
  lines: initialLines,
}: {
  inquiryId: string;
  customerName: string;
  customerEmail: string;
  lines: ResolvedInquiryLine[];
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<EditableLine[]>(() => toEditableLines(initialLines));
  const [notes, setNotes] = useState("");
  const [downloading, startDownload] = useTransition();
  const [sending, startSend] = useTransition();

  const includedLines = lines.filter((l) => l.include && l.quantity > 0);
  const hasPricedLine = includedLines.some((l) => l.unitPrice != null);
  const total = includedLines.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.quantity, 0);

  function patchLine(key: string, changes: Partial<EditableLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  function buildPayload() {
    return {
      inquiryId,
      notes,
      items: includedLines.map((l) => ({
        name: l.name,
        variantLabel: l.variantLabel,
        sku: l.sku,
        seriesName: l.seriesName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    };
  }

  function handleDownload() {
    if (includedLines.length === 0) {
      toast.error("Include at least one product");
      return;
    }
    startDownload(async () => {
      try {
        const { filename, base64 } = await previewQuotePdf(buildPayload());
        downloadBase64File(filename, base64, "application/pdf");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
      }
    });
  }

  function handleSend() {
    if (includedLines.length === 0) {
      toast.error("Include at least one product");
      return;
    }
    startSend(async () => {
      try {
        await sendQuotePdf(buildPayload());
        toast.success(`Quote emailed to ${customerEmail}`);
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send quote");
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
          setLines(toEditableLines(initialLines));
          setNotes("");
        }
      }}
    >
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <FileText className="size-3.5" />
        Prepare quote
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Quote for {customerName}</DialogTitle>
          <DialogDescription>
            Adjust quantities or pricing if needed, then download the PDF or email it directly to{" "}
            {customerEmail}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
          {lines.map((line) => (
            <div
              key={line.key}
              className={cn(
                "flex flex-wrap items-center gap-2.5 rounded-lg border border-border/60 p-2.5",
                !line.include && "opacity-50"
              )}
            >
              <input
                type="checkbox"
                checked={line.include}
                onChange={(e) => patchLine(line.key, { include: e.target.checked })}
                className="h-4 w-4 shrink-0 rounded border-input"
                aria-label={`Include ${line.name} in quote`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {line.name}
                  {line.variantLabel ? ` — ${line.variantLabel}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.seriesName ? `${line.seriesName} · ` : ""}
                  {line.sku ?? "No SKU"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  disabled={!line.include}
                  onChange={(e) =>
                    patchLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="h-7 w-14 text-xs"
                  aria-label={`Quantity for ${line.name}`}
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="On enquiry"
                  value={line.unitPrice ?? ""}
                  disabled={!line.include}
                  onChange={(e) =>
                    patchLine(line.key, {
                      unitPrice: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="h-7 w-24 text-xs"
                  aria-label={`Unit price for ${line.name}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {includedLines.length} product{includedLines.length === 1 ? "" : "s"} included
          </span>
          <span className="font-medium text-foreground">
            {formatPrice(hasPricedLine ? total : null)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quote-notes">Notes for customer (optional)</Label>
          <Textarea
            id="quote-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Lead time, delivery, or payment terms…"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            loading={downloading}
            loadingText="Generating…"
            onClick={handleDownload}
            className="gap-1.5"
          >
            <FileDown className="size-4" />
            Download PDF
          </Button>
          <Button
            type="button"
            loading={sending}
            loadingText="Sending…"
            onClick={handleSend}
            className="gap-1.5"
          >
            <Send className="size-4" />
            Send to {customerEmail}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
