"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { downloadStoredQuotePdf } from "@/lib/actions/admin/quotes";
import { downloadBase64File } from "@/lib/download-file";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderDialog } from "@/components/admin/order-dialog";
import { editableLinesFromQuoteItems } from "@/components/admin/line-item-editor";
import { formatPrice } from "@/lib/format";
import { discountFromRow, discountNote } from "@/lib/discount";
import type { Department } from "@/lib/department";
import type { Quote, QuoteStatus } from "@/lib/supabase/types";

const STATUS_VARIANT: Record<QuoteStatus, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "outline",
  accepted: "default",
  declined: "destructive",
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  sent: "Awaiting response",
  accepted: "Accepted",
  declined: "Declined",
};

export function QuoteHistory({
  quotes,
  customerId,
  customerName,
  department,
}: {
  quotes: Quote[];
  customerId: string;
  customerName: string;
  department: Department | null;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function download(quote: Quote) {
    setDownloadingId(quote.id);
    startTransition(async () => {
      try {
        const { filename, base64 } = await downloadStoredQuotePdf(quote.id);
        downloadBase64File(filename, base64, "application/pdf");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to download quote");
      } finally {
        setDownloadingId(null);
      }
    });
  }

  if (quotes.length === 0) {
    return <p className="text-sm text-muted-foreground">No quotes sent yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {quotes.map((quote) => (
        <li
          key={quote.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-foreground">{quote.quote_number}</p>
              <Badge variant={STATUS_VARIANT[quote.status]}>{STATUS_LABEL[quote.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {quote.items.length} item{quote.items.length === 1 ? "" : "s"} ·{" "}
              {formatPrice(quote.total)}
              {discountNote(quote)} · {new Date(quote.sent_at).toLocaleString()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {department && quote.status === "accepted" && (
              <OrderDialog
                customerId={customerId}
                customerName={customerName}
                department={department}
                quoteId={quote.id}
                inquiryId={quote.inquiry_id}
                lines={editableLinesFromQuoteItems(quote.items)}
                discount={discountFromRow(quote)}
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={downloadingId === quote.id}
              onClick={() => download(quote)}
            >
              {downloadingId === quote.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileDown className="size-3.5" />
              )}
              PDF
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
