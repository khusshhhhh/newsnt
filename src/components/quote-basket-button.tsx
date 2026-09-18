"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, X } from "lucide-react";
import { useQuoteBasket } from "@/lib/quote-basket";
import { submitInquiry } from "@/lib/actions/inquiries";
import { productHref, type Department } from "@/lib/department";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Header trigger for the running multi-product quote request (see quote-basket.ts). */
export function QuoteBasketButton({ department }: { department: Department }) {
  const basket = useQuoteBasket();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitInquiry(null, formData);
      if (result.success) {
        toast.success("Quote request sent — we'll be in touch shortly.");
        formRef.current?.reset();
        basket.clear();
        setOpen(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  if (basket.items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
        aria-label={`Quote request (${basket.items.length} item${basket.items.length === 1 ? "" : "s"})`}
      >
        <ClipboardList className="size-4" />
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {basket.items.length}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Request a quote</DialogTitle>
          <DialogDescription>
            One message covering every product below — we&apos;ll follow up with pricing and
            availability.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {basket.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <Link
                href={productHref(item)}
                onClick={() => setOpen(false)}
                className="text-foreground hover:underline"
              >
                {item.name}
              </Link>
              <button
                type="button"
                onClick={() => basket.removeItem(item.id)}
                aria-label={`Remove ${item.name} from quote request`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="department" value={department} />
          <input type="hidden" name="product_ids" value={basket.items.map((i) => i.id).join(",")} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quote-name">Name</Label>
            <Input id="quote-name" name="name" required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quote-email">Email</Label>
            <Input id="quote-email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quote-phone">Phone (optional)</Label>
            <Input id="quote-phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quote-message">Message (optional)</Label>
            <Textarea
              id="quote-message"
              name="message"
              required
              rows={3}
              defaultValue={`Hi, I'd like a quote for ${basket.items.length} product${basket.items.length === 1 ? "" : "s"}.`}
            />
          </div>
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Sending…" : "Send request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
