import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { QuoteRowActions } from "@/components/admin/quote-row-actions";
import { departmentCopy, isDepartment } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import { editableLinesFromQuoteItems } from "@/components/admin/line-item-editor";
import type { QuoteStatus } from "@/lib/supabase/types";

const STATUS_VARIANT: Record<QuoteStatus, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "outline",
  accepted: "default",
  declined: "destructive",
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  sent: "Awaiting response",
  accepted: "Accepted",
  declined: "Declined",
};

export default async function AdminQuotesPage() {
  const supabase = await createClient();

  const [{ data: quotes }, { data: orders }] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, customer:customers(id, name, email)")
      .order("sent_at", { ascending: false }),
    supabase.from("orders").select("quote_id").not("quote_id", "is", null),
  ]);

  const orderedQuoteIds = new Set((orders ?? []).map((o) => o.quote_id));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Quotes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every quote sent, whether it came from an inquiry or was built from scratch.
          </p>
        </div>
        <Link href="/admin/quotes/new" className={buttonVariants()}>
          New quote
        </Link>
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(quotes ?? []).map((quote) => (
          <div
            key={quote.id}
            className="animate-fade-in flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-foreground">{quote.quote_number}</span>
                <Badge variant={STATUS_VARIANT[quote.status]}>{STATUS_LABEL[quote.status]}</Badge>
                {isDepartment(quote.department) && (
                  <Badge variant="secondary">{departmentCopy(quote.department).shortLabel}</Badge>
                )}
                {orderedQuoteIds.has(quote.id) && <Badge variant="secondary">Ordered</Badge>}
              </div>
              {quote.customer && (
                <Link
                  href={`/admin/customers/${quote.customer.id}`}
                  className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {quote.customer.name} · {quote.customer.email}
                </Link>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {quote.items.length} item{quote.items.length === 1 ? "" : "s"} · {formatPrice(quote.total)} ·{" "}
                {new Date(quote.sent_at).toLocaleDateString()}
              </p>
            </div>

            {quote.customer && isDepartment(quote.department) && (
              <QuoteRowActions
                quoteId={quote.id}
                status={quote.status}
                alreadyOrdered={orderedQuoteIds.has(quote.id)}
                customerId={quote.customer.id}
                customerName={quote.customer.name}
                department={quote.department}
                lines={editableLinesFromQuoteItems(quote.items)}
              />
            )}
          </div>
        ))}

        {(quotes ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No quotes sent yet — create one, or send one from an inquiry.
          </p>
        )}
      </div>
    </div>
  );
}
