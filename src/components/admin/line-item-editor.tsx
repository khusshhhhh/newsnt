"use client";

import { Input } from "@/components/ui/input";
import { DiscountField, TotalsSummary } from "@/components/admin/discount-field";
import { cn } from "@/lib/utils";
import { includedLines, lineItemsTotal, type EditableLine } from "@/lib/quote-lines";
import type { Discount } from "@/lib/discount";

export {
  editableLinesFromResolved,
  editableLinesFromQuoteItems,
  includedLines,
  lineItemsTotal,
  toQuoteLineItems,
  type EditableLine,
} from "@/lib/quote-lines";

/**
 * Editable rows (include toggle, quantity, price) for a quote or order being
 * prepared, plus a running total. Pass `onDiscountChange` to also offer a
 * whole-document discount (percentage or fixed amount).
 */
export function LineItemEditor({
  lines,
  onChange,
  discount = null,
  onDiscountChange,
}: {
  lines: EditableLine[];
  onChange: (next: EditableLine[]) => void;
  discount?: Discount | null;
  onDiscountChange?: (next: Discount | null) => void;
}) {
  function patchLine(key: string, changes: Partial<EditableLine>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  const { hasPricedLine, total } = lineItemsTotal(lines);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
        {lines.map((line) => (
          <div
            key={line.key}
            className={cn(
              "flex flex-wrap items-center gap-2.5 rounded-lg border border-border/60 p-2.5",
              !line.include && "opacity-50"
            )}
          >
            <input
              type="checkbox"
              checked={line.include}
              onChange={(e) => patchLine(line.key, { include: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-input"
              aria-label={`Include ${line.name}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {line.name}
                {line.variantLabel ? ` — ${line.variantLabel}` : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {line.seriesName ? `${line.seriesName} · ` : ""}
                {line.sku ?? "No SKU"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Input
                type="number"
                min="1"
                value={line.quantity}
                disabled={!line.include}
                onChange={(e) =>
                  patchLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                }
                className="h-7 w-14 text-xs"
                aria-label={`Quantity for ${line.name}`}
              />
              <span className="text-xs text-muted-foreground">×</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="On enquiry"
                value={line.unitPrice ?? ""}
                disabled={!line.include}
                onChange={(e) =>
                  patchLine(line.key, {
                    unitPrice: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="h-7 w-24 text-xs"
                aria-label={`Unit price for ${line.name}`}
              />
            </div>
          </div>
        ))}
      </div>

      {onDiscountChange && (
        <DiscountField subtotal={total} discount={discount} onChange={onDiscountChange} />
      )}

      <TotalsSummary
        subtotal={total}
        discount={onDiscountChange ? discount : null}
        priced={hasPricedLine}
        leading={`${includedLines(lines).length} product${includedLines(lines).length === 1 ? "" : "s"} included`}
      />
    </div>
  );
}
