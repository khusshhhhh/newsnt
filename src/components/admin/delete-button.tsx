"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  label = "Delete",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  // "Delete product" -> "Product deleted"
  const itemName = label.replace(/^Delete\s+/i, "");
  const deletedMessage = `${itemName.charAt(0).toUpperCase()}${itemName.slice(1)} deleted`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending}
      loadingText="Deleting…"
      className="text-destructive hover:text-destructive"
      onClick={() => {
        if (!window.confirm(`${label}? This cannot be undone.`)) return;
        startTransition(async () => {
          try {
            await action();
            toast.success(deletedMessage);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete");
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
