"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  label = "Delete",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-destructive hover:text-destructive"
      onClick={() => {
        if (!window.confirm(`${label}? This cannot be undone.`)) return;
        startTransition(() => {
          action();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
