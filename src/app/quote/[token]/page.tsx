import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicQuote } from "@/lib/actions/quote-response";
import { QuoteResponseActions } from "./quote-response-actions";
import { Logo } from "@/components/logo";
import { formatAmount, formatPrice } from "@/lib/format";
import { applyDiscount, discountFromRow, discountLabel, itemsSubtotal } from "@/lib/discount";
import { isPast } from "@/lib/dates";
import { departmentCopy, isDepartment } from "@/lib/department";

export const metadata: Metadata = { title: "Your quote", robots: { index: false, follow: false } };

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getPublicQuote(token);
  if (!quote) notFound();

  const applied = applyDiscount(itemsSubtotal(quote.items), discountFromRow(quote));
  const total = quote.total ?? applied.total;
  const departmentLabel = isDepartment(quote.department) ? departmentCopy(quote.department).label : quote.department;
  const expired = quote.status === "sent" && isPast(quote.expires_at);
  const validUntil = quote.expires_at
    ? new Date(quote.expires_at).toLocaleDateString("en-AU", { dateStyle: "long" })
    : null;

  return (
    <div className="flex min-h-dvh justify-center bg-background px-4 py-12 sm:py-16">
      <div className="w-full max-w-2xl">
        <Logo />

        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Quote {quote.quote_number}
              </p>
              <h1 className="mt-1 font-heading text-2xl text-foreground">Hi {quote.customer_name},</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {departmentLabel} · sent {new Date(quote.sent_at).toLocaleDateString("en-AU")}
                {validUntil && quote.status === "sent" && !expired ? ` · valid until ${validUntil}` : ""}
              </p>
            </div>
          </div>

          <ul className="mt-6 flex flex-col divide-y divide-border border-y border-border">
            {quote.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {item.name}
                    {item.variantLabel ? ` — ${item.variantLabel}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.seriesName ? `${item.seriesName} · ` : ""}
                    {item.sku ?? "No SKU"} · Qty {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-foreground">
                  {item.unitPrice != null ? formatPrice(item.unitPrice * item.quantity) : "On enquiry"}
                </p>
              </li>
            ))}
          </ul>

          {applied.amount > 0 && (
            <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatAmount(applied.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{discountLabel(applied)}</span>
                <span className="tabular-nums">−{formatAmount(applied.amount)}</span>
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-heading text-lg text-foreground">
              {applied.amount > 0 ? formatAmount(total) : formatPrice(total)}
            </span>
          </div>

          {quote.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {quote.notes}
            </p>
          )}

          <div className="mt-6">
            {expired ? (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                This quote expired on {validUntil}. Prices and availability may have changed — reply to the email
                it came in and we&apos;ll send you an updated quote.
              </div>
            ) : (
              <QuoteResponseActions token={token} initialStatus={quote.status} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
