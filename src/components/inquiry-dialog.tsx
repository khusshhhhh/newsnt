"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitInquiry } from "@/lib/actions/inquiries";
import type { Department } from "@/lib/department";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HoneypotField } from "@/components/honeypot-field";

/**
 * Shared submission form for a single-product "Enquire" or a multi-product
 * quote-basket request — same `inquiries` table and `submitInquiry` action
 * either way, just a different `productIds` payload.
 */
export function InquiryDialog({
  department,
  productIds = [],
  variantIds,
  title,
  description,
  defaultMessage = "",
  triggerClassName,
  children,
  onSubmitted,
}: {
  department: Department;
  productIds?: string[];
  /** Selected variant id for each entry in `productIds`, `null` where there's no variant. */
  variantIds?: (string | null)[];
  title: string;
  description?: string;
  defaultMessage?: string;
  triggerClassName?: string;
  children: React.ReactNode;
  onSubmitted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const openedAtRef = useRef(0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("elapsed_ms", String(Date.now() - openedAtRef.current));
    setError(null);
    startTransition(async () => {
      const result = await submitInquiry(null, formData);
      if (result.success) {
        toast.success(result.reference ? `Sent — your reference is ${result.reference}. We've emailed you a copy.` : "Sent — we'll be in touch shortly.");
        formRef.current?.reset();
        setOpen(false);
        onSubmitted?.();
      } else if (result.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) openedAtRef.current = Date.now();
      }}
    >
      <DialogTrigger className={triggerClassName}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="department" value={department} />
          <input type="hidden" name="product_ids" value={productIds.join(",")} />
          <input
            type="hidden"
            name="items"
            value={
              productIds.length > 0
                ? JSON.stringify(
                    productIds.map((product_id, i) => ({
                      product_id,
                      variant_id: variantIds?.[i] ?? null,
                      quantity: 1,
                    }))
                  )
                : ""
            }
          />
          <HoneypotField />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inquiry-name">Name</Label>
            <Input id="inquiry-name" name="name" required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inquiry-email">Email</Label>
            <Input id="inquiry-email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inquiry-phone">Phone (optional)</Label>
            <Input id="inquiry-phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inquiry-message">Message</Label>
            <Textarea
              id="inquiry-message"
              name="message"
              required
              rows={4}
              defaultValue={defaultMessage}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Sending…" : "Send"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
