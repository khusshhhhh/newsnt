import type { ResolvedInquiryLine } from "@/lib/inquiry-lines";
import type { QuoteLineItem } from "@/lib/supabase/types";

/**
 * Pure data helpers for building/reading a quote or order's line items.
 * Deliberately not in line-item-editor.tsx (which is "use client" — it holds
 * the editable-rows UI): a Server Component can't call a function imported
 * from a client-boundary module, and admin/quotes/page.tsx needs these while
 * rendering on the server.
 */

export type EditableLine = {
  key: string;
  include: boolean;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  seriesName: string | null;
  quantity: number;
  unitPrice: number | null;
};

export function editableLinesFromResolved(lines: ResolvedInquiryLine[]): EditableLine[] {
  return lines.map((line, i) => ({
    key: `${line.productId}-${line.variantId ?? "base"}-${i}`,
    include: true,
    name: line.name,
    variantLabel: line.variantLabel,
    sku: line.sku,
    seriesName: line.seriesName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }));
}

export function editableLinesFromQuoteItems(items: QuoteLineItem[]): EditableLine[] {
  return items.map((item, i) => ({
    key: `item-${i}`,
    include: true,
    name: item.name,
    variantLabel: item.variantLabel,
    sku: item.sku,
    seriesName: item.seriesName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

export function includedLines(lines: EditableLine[]) {
  return lines.filter((l) => l.include && l.quantity > 0);
}

export function lineItemsTotal(lines: EditableLine[]) {
  const included = includedLines(lines);
  const hasPricedLine = included.some((l) => l.unitPrice != null);
  const total = included.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.quantity, 0);
  return { hasPricedLine, total };
}

export function toQuoteLineItems(lines: EditableLine[]): QuoteLineItem[] {
  return includedLines(lines).map((l) => ({
    name: l.name,
    variantLabel: l.variantLabel,
    sku: l.sku,
    seriesName: l.seriesName,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
  }));
}
