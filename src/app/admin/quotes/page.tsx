import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { AdminSearchBox } from "@/components/admin/admin-search-box";
import { QuoteRowActions } from "@/components/admin/quote-row-actions";
import { departmentCopy, isDepartment } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import { daysAgoIso, isPast } from "@/lib/dates";
import { ilikeContainsPattern } from "@/lib/search";
import { buildHref, pageCount, pageRange, parsePage } from "@/lib/admin-list";
import { editableLinesFromQuoteItems } from "@/lib/quote-lines";
import { discountFromRow, discountNote } from "@/lib/discount";
import { cn } from "@/lib/utils";
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

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "awaiting", label: "Awaiting reply" },
  { value: "follow-up", label: "Needs follow-up" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
] as const;
type Filter = Exclude<(typeof FILTERS)[number]["value"], undefined>;

function isFilter(value: string): value is Filter {
  return FILTERS.some((f) => f.value === value);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const { filter: rawFilter, q: rawQuery, page: rawPage } = await searchParams;
  const filter = rawFilter && isFilter(rawFilter) ? rawFilter : undefined;
  const q = rawQuery?.trim() ?? "";
  const page = parsePage(rawPage);
  const current = { filter, q };
  const supabase = await createClient();

  const nowIso = daysAgoIso(0);
  let query = supabase
    .from("quotes")
    .select("*, customer:customers(id, name, email)", { count: "exact" })
    .order("sent_at", { ascending: false });
  if (filter === "awaiting") query = query.eq("status", "sent").gt("expires_at", nowIso);
  if (filter === "follow-up")
    query = query.eq("status", "sent").gt("expires_at", nowIso).lt("sent_at", daysAgoIso(7)).is("reminder_sent_at", null);
  if (filter === "accepted" || filter === "declined") query = query.eq("status", filter);
  if (filter === "expired") query = query.eq("status", "sent").lte("expires_at", nowIso);
  const pattern = ilikeContainsPattern(q);
  if (pattern) query = query.ilike("quote_number", pattern);
  const [from, to] = pageRange(page);

  const [{ data: quotes, count }, { data: orders }] = await Promise.all([
    query.range(from, to),
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
        <Link href="/admin/quotes/new" className={buttonVariants()} data-admin-new>
          New quote
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border p-1 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={buildHref("/admin/quotes", current, { filter: f.value, page: undefined })}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                filter === f.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <AdminSearchBox initialQuery={q} placeholder="Search by quote number…" label="Search quotes" />
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(quotes ?? []).map((quote) => {
          const expired = quote.status === "sent" && isPast(quote.expires_at);
          const canRemind = quote.status === "sent" && !expired;
          return (
            <div
              key={quote.id}
              className="animate-fade-in flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground">{quote.quote_number}</span>
                  {expired ? (
                    <Badge variant="secondary">Expired</Badge>
                  ) : (
                    <Badge variant={STATUS_VARIANT[quote.status]}>{STATUS_LABEL[quote.status]}</Badge>
                  )}
                  {quote.version > 1 && <Badge variant="secondary">v{quote.version}</Badge>}
                  {isDepartment(quote.department) && (
                    <Badge variant="secondary">{departmentCopy(quote.department).shortLabel}</Badge>
                  )}
                  {orderedQuoteIds.has(quote.id) && <Badge variant="secondary">Ordered</Badge>}
                </div>
                {quote.customer && (
                  <Link
                    href={`/admin/customers/${quote.customer.id}`}
                    data-admin-row
                    className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {quote.customer.name} · {quote.customer.email}
                  </Link>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {quote.items.length} item{quote.items.length === 1 ? "" : "s"} · {formatPrice(quote.total)}
                  {discountNote(quote)} · sent{" "}
                  {shortDate(quote.sent_at)}
                  {quote.status === "sent" && quote.expires_at && !expired && ` · valid until ${shortDate(quote.expires_at)}`}
                  {quote.reminder_sent_at && ` · reminded ${shortDate(quote.reminder_sent_at)}`}
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
                  discount={discountFromRow(quote)}
                  canRemind={canRemind}
                  reminded={Boolean(quote.reminder_sent_at)}
                />
              )}
            </div>
          );
        })}

        {(quotes ?? []).length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {filter || q ? (
              <>
                No quotes match.{" "}
                <Link href="/admin/quotes" className="text-foreground underline underline-offset-4">
                  Show all quotes
                </Link>
              </>
            ) : (
              <>
                No quotes sent yet —{" "}
                <Link href="/admin/quotes/new" className="text-foreground underline underline-offset-4">
                  create one
                </Link>
                , or send one from an inquiry.
              </>
            )}
          </div>
        )}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount(count)}
        buildHref={(p) => buildHref("/admin/quotes", current, { page: p > 1 ? String(p) : undefined })}
      />
    </div>
  );
}
