"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
      <TriangleAlert className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="mt-4 font-heading text-xl text-foreground">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {error.message || "This admin page failed to load."}
      </p>
      <Button onClick={reset} className="mt-6" size="sm">
        Try again
      </Button>
    </div>
  );
}
