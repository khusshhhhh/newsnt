"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { applyDiscount, discountLabel, formatPercent, normalizeDiscount, type Discount, type DiscountType } from "@/lib/discount";
import { formatAmount, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Discount input for a quote or order: a % / $ switch plus one number. The
 * other form is always shown alongside it ("= $120 off" / "= 12.5% off"),
 * and switching the unit converts the value rather than reinterpreting it —
 * 10% of a $1,200 subtotal becomes $120, not $10.
 */
export function DiscountField({
  subtotal,
  discount,
  onChange,
  id = "discount",
  disabled,
}: {
  subtotal: number;
  discount: Discount | null;
  onChange: (next: Discount | null) => void;
  id?: string;
  disabled?: boolean;
}) {
  const [type, setType] = useState<DiscountType>(discount?.type ?? "percent");
  const [text, setText] = useState(discount ? String(discount.value) : "");

  function emit(nextType: DiscountType, raw: string) {
    const value = Number(raw);
    onChange(raw.trim() && Number.isFinite(value) ? normalizeDiscount({ type: nextType, value }) : null);
  }

  function switchType(next: DiscountType) {
    if (next === type) return;
    let raw = text;
    const value = Number(text);
    if (text.trim() && value > 0 && subtotal > 0) {
      raw =
        next === "amount"
          ? String(round2((subtotal * Math.min(value, 100)) / 100))
          : String(round2(Math.min(100, (value / subtotal) * 100)));
    }
    setType(next);
    setText(raw);
    emit(next, raw);
  }

  function clear() {
    setText("");
    onChange(null);
  }

  const applied = applyDiscount(subtotal, discount);
  const value = Number(text);
  const overPercent = type === "percent" && value > 100;
  const overAmount = type === "amount" && subtotal > 0 && value > subtotal;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-foreground">
        Discount
      </label>
      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Discount type"
          className="flex h-8 shrink-0 items-center rounded-lg border border-input p-0.5 text-xs"
        >
          {(
            [
              { value: "percent", label: "%", title: "Percentage of the subtotal" },
              { value: "amount", label: "$", title: "Fixed dollar amount" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={type === option.value}
              title={option.title}
              disabled={disabled}
              onClick={() => switchType(option.value)}
              className={cn(
                "h-full w-8 rounded-md font-semibold transition-colors disabled:opacity-50",
                type === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="relative w-32">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min="0"
            max={type === "percent" ? 100 : undefined}
            step={type === "percent" ? "0.5" : "0.01"}
            placeholder={type === "percent" ? "e.g. 10" : "e.g. 150"}
            value={text}
            disabled={disabled}
            aria-invalid={overPercent || overAmount || undefined}
            onChange={(e) => {
              setText(e.target.value);
              emit(type, e.target.value);
            }}
            className="h-8 pr-7"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {type === "percent" ? "%" : "AUD"}
          </span>
        </div>
        {text && (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="Remove discount"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {applied.amount > 0
          ? type === "percent"
            ? `= ${formatAmount(applied.amount)} off ${formatPrice(subtotal)}`
            : `= ${formatPercent(applied.percent)} off ${formatPrice(subtotal)}`
          : subtotal > 0
            ? "Optional — as a percentage or a fixed amount off the subtotal."
            : "Add prices to the lines to apply a discount."}
        {overPercent && " Capped at 100%."}
        {overAmount && " Capped at the subtotal."}
      </p>
    </div>
  );
}

/** Subtotal → discount → total, shown under line items and in the order detail dialog. */
export function TotalsSummary({
  subtotal,
  discount,
  priced = true,
  leading,
}: {
  subtotal: number;
  discount: Discount | null;
  /** False when no line has a price yet — the total then reads "Price on enquiry". */
  priced?: boolean;
  /** Optional left-hand note on the total row, e.g. "3 products included". */
  leading?: React.ReactNode;
}) {
  const applied = applyDiscount(subtotal, discount);
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
      {applied.amount > 0 && (
        <>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatAmount(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{discountLabel(applied)}</span>
            <span className="tabular-nums">−{formatAmount(applied.amount)}</span>
          </div>
        </>
      )}
      <div className={cn("flex items-center justify-between", applied.amount > 0 && "border-t border-border pt-1")}>
        <span className="text-muted-foreground">{leading ?? "Total"}</span>
        <span className="font-medium tabular-nums text-foreground">
          {priced ? formatAmount(applied.total) : formatPrice(null)}
        </span>
      </div>
    </div>
  );
}
