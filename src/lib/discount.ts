import { formatAmount } from "@/lib/format";
import type { DiscountType, QuoteLineItem } from "@/lib/supabase/types";

export type { DiscountType };

/**
 * A single discount applied to a whole quote or order — either a percentage
 * of the subtotal or a fixed dollar amount off it. Stored on the row as
 * `discount_type` + `discount_value`; `total` on the row is always the
 * post-discount figure, so reports and lists never need to re-apply it.
 */
export type Discount = { type: DiscountType; value: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function itemsSubtotal(items: Pick<QuoteLineItem, "unitPrice" | "quantity">[]) {
  return round2(items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0));
}

/** Drops empty/zero/invalid discounts to null and caps a percentage at 100. */
export function normalizeDiscount(discount: Discount | null | undefined): Discount | null {
  if (!discount || !Number.isFinite(discount.value) || discount.value <= 0) return null;
  if (discount.type === "percent") return { type: "percent", value: Math.min(100, round2(discount.value)) };
  return { type: "amount", value: round2(discount.value) };
}

/** Reads the discount columns off a quote/order row (numeric columns can arrive as strings). */
export function discountFromRow(row: { discount_type?: string | null; discount_value?: number | string | null }) {
  if (row.discount_type !== "percent" && row.discount_type !== "amount") return null;
  return normalizeDiscount({ type: row.discount_type, value: Number(row.discount_value) });
}

/**
 * Works out both sides of a discount so it can always be shown as a
 * percentage *and* a dollar amount, whichever way it was entered. The
 * amount never exceeds the subtotal, so a total can't go negative.
 */
export function applyDiscount(subtotal: number, discount: Discount | null | undefined) {
  const d = normalizeDiscount(discount);
  if (!d || subtotal <= 0) return { subtotal, amount: 0, percent: 0, total: subtotal, discount: d };
  const amount = round2(Math.min(subtotal, d.type === "percent" ? (subtotal * d.value) / 100 : d.value));
  const percent = d.type === "percent" ? d.value : round2((amount / subtotal) * 100);
  return { subtotal, amount, percent, total: round2(subtotal - amount), discount: d };
}

/** Post-discount total for a set of line items. */
export function discountedTotal(items: Pick<QuoteLineItem, "unitPrice" | "quantity">[], discount: Discount | null | undefined) {
  return applyDiscount(itemsSubtotal(items), discount).total;
}

/** 10 → "10%", 12.5 → "12.5%", 12.345 → "12.35%". */
export function formatPercent(percent: number) {
  return `${Number(percent.toFixed(2))}%`;
}

/**
 * "Discount (12.5%)" — paired with the dollar figure in the amount column,
 * so the discount always reads as both a percentage and an amount no
 * matter which way it was entered.
 */
export function discountLabel(applied: ReturnType<typeof applyDiscount>) {
  return applied.discount ? `Discount (${formatPercent(applied.percent)})` : "Discount";
}

/** " (10% off)" / " ($150 off)" after a total in a one-line summary; "" with no discount. */
export function discountNote(row: Parameters<typeof discountFromRow>[0]) {
  const d = discountFromRow(row);
  if (!d) return "";
  return ` (${d.type === "percent" ? formatPercent(d.value) : formatAmount(d.value)} off)`;
}
