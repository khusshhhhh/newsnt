import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { CustomerSearchBox } from "@/components/admin/customer-search-box";
import { departmentCopy } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import { ilikeContainsPattern } from "@/lib/search";
import { Pagination } from "@/components/pagination";
import { buildHref, pageCount, pageRange, parsePage } from "@/lib/admin-list";
import type { InquiryStatus } from "@/lib/supabase/types";

const OPEN_STATUSES: InquiryStatus[] = ["new", "contacted", "quoted"];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q: rawQuery, page: rawPage } = await searchParams;
  const q = rawQuery?.trim() ?? "";
  const page = parsePage(rawPage);

  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const pattern = ilikeContainsPattern(q);
  if (pattern) query = query.or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
  const [from, to] = pageRange(page);
  const { data: customers, count } = await query.range(from, to);

  const customerIds = (customers ?? []).map((c) => c.id);

  const [{ data: inquiryRows }, { data: quoteRows }, { data: orderRows }] = await Promise.all([
    customerIds.length > 0
      ? supabase.from("inquiries").select("customer_id, status").in("customer_id", customerIds)
      : Promise.resolve({ data: [] as { customer_id: string | null; status: InquiryStatus }[] }),
    customerIds.length > 0
      ? supabase.from("quotes").select("customer_id, total").in("customer_id", customerIds)
      : Promise.resolve({ data: [] as { customer_id: string; total: number | null }[] }),
    customerIds.length > 0
      ? supabase.from("orders").select("customer_id").in("customer_id", customerIds)
      : Promise.resolve({ data: [] as { customer_id: string }[] }),
  ]);

  type Stats = { inquiries: number; openInquiries: number; quotes: number; quoteValue: number; orders: number };
  const statsById = new Map<string, Stats>(
    customerIds.map((id) => [id, { inquiries: 0, openInquiries: 0, quotes: 0, quoteValue: 0, orders: 0 }])
  );
  for (const row of inquiryRows ?? []) {
    const stats = row.customer_id ? statsById.get(row.customer_id) : undefined;
    if (!stats) continue;
    stats.inquiries += 1;
    if (OPEN_STATUSES.includes(row.status)) stats.openInquiries += 1;
  }
  for (const row of quoteRows ?? []) {
    const stats = statsById.get(row.customer_id);
    if (!stats) continue;
    stats.quotes += 1;
    stats.quoteValue += row.total ?? 0;
  }
  for (const row of orderRows ?? []) {
    const stats = statsById.get(row.customer_id);
    if (!stats) continue;
    stats.orders += 1;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{count ?? 0} customers</p>
        </div>
      </div>

      <div className="mt-4">
        <CustomerSearchBox initialQuery={q} />
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {(customers ?? []).map((customer) => {
          const stats = statsById.get(customer.id) ?? {
            inquiries: 0,
            openInquiries: 0,
            quotes: 0,
            quoteValue: 0,
            orders: 0,
          };
          return (
            <Link
              key={customer.id}
              href={`/admin/customers/${customer.id}`}
              data-admin-row
              className="animate-fade-in focus-visible:bg-accent/50 focus-visible:outline-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-foreground">{customer.name}</span>
                  {customer.department && (
                    <Badge variant="secondary" className="shrink-0">
                      {departmentCopy(customer.department).shortLabel}
                    </Badge>
                  )}
                  {stats.openInquiries > 0 && (
                    <Badge className="shrink-0">
                      {stats.openInquiries} open
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {customer.email}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <p>
                  {stats.inquiries} inquir{stats.inquiries === 1 ? "y" : "ies"} · {stats.quotes} quote
                  {stats.quotes === 1 ? "" : "s"}
                  {stats.quoteValue > 0 ? ` (${formatPrice(stats.quoteValue)})` : ""} · {stats.orders} order
                  {stats.orders === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5">
                  Last active {new Date(customer.updated_at).toLocaleDateString("en-AU")}
                </p>
              </div>
            </Link>
          );
        })}

        {(customers ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {q ? "No customers match." : "No customers yet — they're created automatically from inquiries."}
          </p>
        )}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount(count)}
        buildHref={(p) => buildHref("/admin/customers", { q }, { page: p > 1 ? String(p) : undefined })}
      />
    </div>
  );
}
