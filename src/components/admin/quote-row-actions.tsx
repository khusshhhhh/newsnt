"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { downloadStoredQuotePdf } from "@/lib/actions/admin/quotes";
import { downloadBase64File } from "@/lib/download-file";
import { Button } from "@/components/ui/button";
import { OrderDialog } from "@/components/admin/order-dialog";
import type { EditableLine } from "@/components/admin/line-item-editor";
import type { Department } from "@/lib/department";
import type { QuoteStatus } from "@/lib/supabase/types";

export function QuoteRowActions({
  quoteId,
  status,
  alreadyOrdered,
  customerId,
  customerName,
  department,
  lines,
}: {
  quoteId: string;
  status: QuoteStatus;
  alreadyOrdered: boolean;
  customerId: string;
  customerName: string;
  department: Department;
  lines: EditableLine[];
}) {
  const [downloading, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      try {
        const { filename, base64 } = await downloadStoredQuotePdf(quoteId);
        downloadBase64File(filename, base64, "application/pdf");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to download quote");
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {status === "accepted" && !alreadyOrdered && (
        <OrderDialog
          customerId={customerId}
          customerName={customerName}
          department={department}
          quoteId={quoteId}
          lines={lines}
        />
      )}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={downloading} onClick={download}>
        {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
        PDF
      </Button>
    </div>
  );
}
