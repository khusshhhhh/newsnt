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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LineItemEditor,
  editableLinesFromResolved,
  includedLines,
  toQuoteLineItems,
  type EditableLine,
} from "@/components/admin/line-item-editor";
import { previewQuotePdf, sendQuotePdf } from "@/lib/actions/admin/quotes";
import { downloadBase64File } from "@/lib/download-file";
import { cn } from "@/lib/utils";
import type { ResolvedInquiryLine } from "@/lib/inquiry-lines";

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
  const [lines, setLines] = useState<EditableLine[]>(() => editableLinesFromResolved(initialLines));
  const [notes, setNotes] = useState("");
  const [downloading, startDownload] = useTransition();
  const [sending, startSend] = useTransition();

  function buildPayload() {
    return { inquiryId, notes, items: toQuoteLineItems(lines) };
  }

  function handleDownload() {
    if (includedLines(lines).length === 0) {
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
    if (includedLines(lines).length === 0) {
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
          setLines(editableLinesFromResolved(initialLines));
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

        <LineItemEditor lines={lines} onChange={setLines} />

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
