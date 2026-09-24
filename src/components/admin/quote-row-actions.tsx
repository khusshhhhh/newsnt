"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellRing, FileDown, Loader2, PencilLine } from "lucide-react";
import { downloadStoredQuotePdf, sendQuoteReminder } from "@/lib/actions/admin/quotes";
import { downloadBase64File } from "@/lib/download-file";
import { Button, buttonVariants } from "@/components/ui/button";
import { OrderDialog } from "@/components/admin/order-dialog";
import type { EditableLine } from "@/components/admin/line-item-editor";
import type { Department } from "@/lib/department";
import type { QuoteStatus } from "@/lib/supabase/types";
import type { Discount } from "@/lib/discount";

export function QuoteRowActions({
  quoteId,
  status,
  alreadyOrdered,
  customerId,
  customerName,
  department,
  lines,
  discount = null,
  canRemind = false,
  reminded = false,
}: {
  quoteId: string;
  status: QuoteStatus;
  alreadyOrdered: boolean;
  customerId: string;
  customerName: string;
  department: Department;
  lines: EditableLine[];
  discount?: Discount | null;
  canRemind?: boolean;
  reminded?: boolean;
}) {
  const [downloading, startTransition] = useTransition();
  const [reminding, startReminder] = useTransition();
  const [remindedNow, setRemindedNow] = useState(false);

  function remind() {
    if ((reminded || remindedNow) && !window.confirm("A reminder was already sent for this quote. Send another?")) return;
    startReminder(async () => {
      try {
        await sendQuoteReminder(quoteId);
        setRemindedNow(true);
        toast.success(`Reminder sent to ${customerName}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't send the reminder");
      }
    });
  }

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
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {status === "accepted" && !alreadyOrdered && (
        <OrderDialog
          customerId={customerId}
          customerName={customerName}
          department={department}
          quoteId={quoteId}
          lines={lines}
          discount={discount}
        />
      )}
      {canRemind && (
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" disabled={reminding} onClick={remind}>
          {reminding ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
          {remindedNow ? "Reminded" : "Remind"}
        </Button>
      )}
      {status !== "accepted" && (
        <Link
          href={`/admin/quotes/new?from=${quoteId}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          title="Send a revised version of this quote"
        >
          <PencilLine className="size-3.5" />
          Revise
        </Link>
      )}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={downloading} onClick={download}>
        {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
        PDF
      </Button>
    </div>
  );
}
