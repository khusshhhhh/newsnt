"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { trashInquiry } from "@/lib/actions/admin/inquiries";
import { Button } from "@/components/ui/button";

export function TrashInquiryButton({ inquiryId }: { inquiryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending}
      loadingText="Moving…"
      className="text-destructive hover:text-destructive"
      onClick={() => {
        if (!window.confirm("Move this inquiry to trash? You can restore it later.")) return;
        startTransition(async () => {
          try {
            await trashInquiry(inquiryId);
            toast.success("Moved to trash");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to trash inquiry");
          }
        });
      }}
    >
      <Trash2 className="size-3.5" />
      Delete
    </Button>
  );
}
