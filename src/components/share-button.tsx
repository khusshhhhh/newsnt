"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shares the current page URL — which the product page keeps in step with the
 * selected finish, so the link opens on the same colour. Touch devices get the
 * native share sheet (WhatsApp, Messages, AirDrop…); everything else copies
 * the link, since a desktop share dialog is rarely what anyone wants.
 */
export function ShareButton({ title, text, className }: { title: string; text?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Dismissing the sheet isn't a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link — copy it from the address bar instead.");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground",
        className
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
