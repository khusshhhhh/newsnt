"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { respondToQuote } from "@/lib/actions/quote-response";
import { Button } from "@/components/ui/button";
import type { QuoteStatus } from "@/lib/supabase/types";

export function QuoteResponseActions({ token, initialStatus }: { token: string; initialStatus: QuoteStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [respondingTo, setRespondingTo] = useState<QuoteStatus | null>(null);

  function respond(next: "accepted" | "declined") {
    setRespondingTo(next);
    startTransition(async () => {
      try {
        const { applied } = await respondToQuote(token, next);
        if (!applied) {
          toast.error("This quote was already responded to.");
        }
        setStatus(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (status === "accepted") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
        <Check className="size-4 shrink-0 text-foreground" />
        You accepted this quote. We&apos;ll be in touch to arrange next steps.
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <X className="size-4 shrink-0" />
        You declined this quote.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        onClick={() => respond("accepted")}
        loading={pending && respondingTo === "accepted"}
        loadingText="Accepting…"
        disabled={pending && respondingTo !== "accepted"}
        className="gap-1.5"
      >
        <Check className="size-4" />
        Accept quote
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => respond("declined")}
        loading={pending && respondingTo === "declined"}
        loadingText="Declining…"
        disabled={pending && respondingTo !== "declined"}
        className="gap-1.5"
      >
        <X className="size-4" />
        Decline
      </Button>
    </div>
  );
}
