"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { importProductsCsv, type ImportSummary } from "@/lib/actions/admin/csv";
import { Button } from "@/components/ui/button";

const initialState: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

export function CsvImportForm() {
  const [state, formAction, pending] = useActionState(importProductsCsv, initialState);

  useEffect(() => {
    if (pending || state === initialState) return;
    const summaryLine = `${state.created} created · ${state.updated} updated · ${state.skipped} skipped`;
    if (state.errors.length > 0) {
      toast.error(summaryLine, { description: state.errors.slice(0, 3).join("; ") });
    } else {
      toast.success(summaryLine);
    }
  }, [state, pending]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
      />
      <Button type="submit" variant="outline" size="sm" loading={pending} loadingText="Importing…">
        Import CSV
      </Button>
    </form>
  );
}
