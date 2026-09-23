import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicQuote } from "@/lib/actions/quote-response";
import { QuoteResponseActions } from "./quote-response-actions";
import { Logo } from "@/components/logo";
import { formatPrice } from "@/lib/format";
import { departmentCopy, isDepartment } from "@/lib/department";

export const metadata: Metadata = { title: "Your quote", robots: { index: false, follow: false } };

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getPublicQuote(token);
  if (!quote) notFound();

  const total = quote.total ?? quote.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
  const departmentLabel = isDepartment(quote.department) ? departmentCopy(quote.department).label : quote.department;

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
                {departmentLabel} · sent {new Date(quote.sent_at).toLocaleDateString()}
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

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-heading text-lg text-foreground">{formatPrice(total)}</span>
          </div>

          {quote.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {quote.notes}
            </p>
          )}

          <div className="mt-6">
            <QuoteResponseActions token={token} initialStatus={quote.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
