"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, Minus, Plus, X } from "lucide-react";
import { OPEN_BASKET_EVENT, useQuoteBasket, type QuoteBasketItem } from "@/lib/quote-basket";
import { formatPrice } from "@/lib/format";
import { submitInquiry } from "@/lib/actions/inquiries";
import { productHref, type Department } from "@/lib/department";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FULL_SCREEN_ON_MOBILE,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HoneypotField } from "@/components/honeypot-field";
import { cn } from "@/lib/utils";

// The `inquiries.product_ids` column only knows product ids, not
// colour/variant — so the auto-filled message spells out each line
// ("Lotus Basin Mixer (Matte Black) × 3") to carry that detail to staff
// without a schema change.
function defaultQuoteMessage(items: QuoteBasketItem[]) {
  const lines = items.map(
    (item) => `- ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""} × ${item.quantity}`
  );
  return `Hi, I'd like a quote for:\n${lines.join("\n")}`;
}

/** Header trigger for the running multi-product quote request (see quote-basket.ts). */
export function QuoteBasketButton({ department }: { department: Department }) {
  const basket = useQuoteBasket();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const openedAtRef = useRef(0);

  useEffect(() => {
    function onOpen() {
      openedAtRef.current = Date.now();
      setOpen(true);
    }
    window.addEventListener(OPEN_BASKET_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BASKET_EVENT, onOpen);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("elapsed_ms", String(Date.now() - openedAtRef.current));
    startTransition(async () => {
      const result = await submitInquiry(null, formData);
      if (result.success) {
        toast.success(
          result.reference
            ? `Quote request ${result.reference} sent — check your inbox for a confirmation.`
            : "Quote request sent — we'll be in touch shortly."
        );
        formRef.current?.reset();
        basket.clear();
        setOpen(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  if (basket.items.length === 0) return null;

  // Repeating a product's id per unit lets the legacy `inquiries.product_ids`
  // column carry quantity without a schema change — kept for anything still
  // reading it. `items` below is the structured version that also carries
  // which variant was requested, which `product_ids` alone can't.
  const expandedProductIds = basket.items.flatMap((item) =>
    Array(item.quantity).fill(item.productId)
  );
  const quoteItems = basket.items.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    quantity: item.quantity,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) openedAtRef.current = Date.now();
      }}
    >
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
        aria-label={`Quote request (${basket.totalQuantity} item${basket.totalQuantity === 1 ? "" : "s"})`}
      >
        <ClipboardList className="size-4" />
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {basket.totalQuantity}
        </span>
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-sm", FULL_SCREEN_ON_MOBILE)}>
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
              key={item.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <Link
                href={productHref(item)}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 text-foreground hover:underline"
              >
                <span className="block truncate">{item.name}</span>
                {item.variantLabel && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.variantLabel}
                  </span>
                )}
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => basket.setQuantity(item.key, item.quantity - 1)}
                  aria-label={`Decrease quantity of ${item.name}${item.variantLabel ? ` in ${item.variantLabel}` : ""}`}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-5 text-center text-xs tabular-nums text-foreground">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => basket.setQuantity(item.key, item.quantity + 1)}
                  aria-label={`Increase quantity of ${item.name}${item.variantLabel ? ` in ${item.variantLabel}` : ""}`}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => basket.removeItem(item.key)}
                  aria-label={`Remove ${item.name}${item.variantLabel ? ` in ${item.variantLabel}` : ""} from quote request`}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {basket.estimate.total > 0 && (
          <p className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Estimate{basket.estimate.hasUnpriced ? " (priced items only)" : ""}
            </span>
            <span className="font-medium tabular-nums text-foreground">{formatPrice(basket.estimate.total)}</span>
          </p>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="department" value={department} />
          <input type="hidden" name="product_ids" value={expandedProductIds.join(",")} />
          <input type="hidden" name="items" value={JSON.stringify(quoteItems)} />
          <HoneypotField />
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
              rows={Math.min(8, basket.items.length + 2)}
              defaultValue={defaultQuoteMessage(basket.items)}
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
