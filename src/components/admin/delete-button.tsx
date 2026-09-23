"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Delete with a confirm that names the item. When `undo` is given (anything
 * that goes to trash rather than being destroyed), the confirm says so and
 * the success toast carries an Undo button.
 */
export function DeleteButton({
  action,
  undo,
  label = "Delete",
  itemName,
}: {
  action: () => Promise<void>;
  undo?: () => Promise<void>;
  label?: string;
  /** Shown in the confirm, e.g. "Aria Basin Mixer". */
  itemName?: string;
}) {
  const [pending, startTransition] = useTransition();
  // "Delete product" -> "Product"
  const noun = label.replace(/^Delete\s+/i, "");
  const nounCapitalized = `${noun.charAt(0).toUpperCase()}${noun.slice(1)}`;
  const target = itemName ? `“${itemName}”` : `this ${noun.toLowerCase()}`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending}
      loadingText="Deleting…"
      className="text-destructive hover:text-destructive"
      aria-label={itemName ? `${label}: ${itemName}` : label}
      onClick={() => {
        const message = undo
          ? `Move ${target} to trash? You can restore it from Trash.`
          : `Delete ${target}? This cannot be undone.`;
        if (!window.confirm(message)) return;
        startTransition(async () => {
          try {
            await action();
            toast.success(undo ? `${nounCapitalized} moved to trash` : `${nounCapitalized} deleted`, {
              action: undo
                ? {
                    label: "Undo",
                    onClick: () => {
                      undo()
                        .then(() => toast.success(`${nounCapitalized} restored`))
                        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't restore"));
                    },
                  }
                : undefined,
            });
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
