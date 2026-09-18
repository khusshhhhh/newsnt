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

/**
 * Shared submission form for a single-product "Enquire" or a multi-product
 * quote-basket request — same `inquiries` table and `submitInquiry` action
 * either way, just a different `productIds` payload.
 */
export function InquiryDialog({
  department,
  productIds = [],
  title,
  description,
  defaultMessage = "",
  triggerClassName,
  children,
  onSubmitted,
}: {
  department: Department;
  productIds?: string[];
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await submitInquiry(null, formData);
      if (result.success) {
        toast.success("Sent — we'll be in touch shortly.");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerClassName}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="department" value={department} />
          <input type="hidden" name="product_ids" value={productIds.join(",")} />
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
