import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, roleCan } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, weeklyBuckets, type BarDatum } from "@/components/admin/bar-chart";
import { inquiryLineCounts } from "@/lib/notifications";
import { daysAgoIso } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { DEPARTMENTS, departmentCopy } from "@/lib/department";
import type { InquiryItem, QuoteLineItem } from "@/lib/supabase/types";

export const metadata = { title: "Reports" };

function orderTotal(order: { total: number | null; items: QuoteLineItem[] }) {
  return order.total ?? order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0);
}

function monthlyRevenue(orders: { created_at: string; total: number | null; items: QuoteLineItem[] }[], months: number) {
  const now = new Date();
  const buckets: (BarDatum & { key: string })[] = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-AU", { month: "short" }), value: 0 };
  });
  for (const order of orders) {
    const d = new Date(order.created_at);
    const bucket = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.value += orderTotal(order);
  }
  return buckets.map((b) => ({ label: b.label, value: Math.round(b.value), display: formatPrice(b.value) }));
}

function percent(part: number, whole: number) {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

export default async function ReportsPage() {
  const { role } = await requireAdmin();
  if (!roleCan(role, "sales")) notFound();
  const supabase = await createClient();

  const since12Weeks = daysAgoIso(12 * 7);
  const since90Days = daysAgoIso(90);
  const since6Months = daysAgoIso(186);

  const [{ data: inquiries }, { data: quotes }, { data: orders }] = await Promise.all([
    supabase
      .from("inquiries")
      .select("created_at, items, product_ids, status")
      .gte("created_at", since12Weeks)
      .is("deleted_at", null),
    supabase.from("quotes").select("id, status, sent_at, total").gte("sent_at", since90Days),
    supabase
      .from("orders")
      .select("created_at, total, items, department, status, quote_id")
      .gte("created_at", since6Months)
      .neq("status", "cancelled"),
  ]);

  const inquiryRows = inquiries ?? [];
  const quoteRows = quotes ?? [];
  const orderRows = (orders ?? []).map((o) => ({ ...o, items: o.items as QuoteLineItem[] }));

  // Conversion over the last 90 days.
  const orderedQuoteIds = new Set(orderRows.map((o) => o.quote_id).filter(Boolean));
  const accepted = quoteRows.filter((q) => q.status === "accepted").length;
  const declined = quoteRows.filter((q) => q.status === "declined").length;
  const ordered = quoteRows.filter((q) => orderedQuoteIds.has(q.id)).length;
  const quotedValue = quoteRows.reduce((sum, q) => sum + (q.total ?? 0), 0);

  // Most-requested products across inquiries (12 weeks).
  const requestCounts = new Map<string, number>();
  for (const inquiry of inquiryRows) {
    for (const [id, qty] of inquiryLineCounts({ items: inquiry.items as InquiryItem[] | null, product_ids: inquiry.product_ids })) {
      requestCounts.set(id, (requestCounts.get(id) ?? 0) + qty);
    }
  }
  const topIds = [...requestCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const { data: topProducts } =
    topIds.length > 0
      ? await supabase.from("products").select("id, name, sku").in("id", topIds.map(([id]) => id))
      : { data: [] as { id: string; name: string; sku: string | null }[] };
  const productName = new Map((topProducts ?? []).map((p) => [p.id, p.sku ? `${p.name} (${p.sku})` : p.name]));

  const revenueByDepartment = DEPARTMENTS.map((d) => ({
    department: d,
    total: orderRows.filter((o) => o.department === d).reduce((sum, o) => sum + orderTotal(o), 0),
    count: orderRows.filter((o) => o.department === d).length,
  }));
  const revenue = monthlyRevenue(orderRows, 6);
  const revenueTotal = revenueByDepartment.reduce((sum, d) => sum + d.total, 0);

  const tiles = [
    { label: "Quotes sent (90 days)", value: String(quoteRows.length), note: `${formatPrice(quotedValue)} quoted` },
    { label: "Accepted", value: percent(accepted, quoteRows.length), note: `${accepted} quote${accepted === 1 ? "" : "s"}` },
    { label: "Declined", value: percent(declined, quoteRows.length), note: `${declined} quote${declined === 1 ? "" : "s"}` },
    { label: "Became orders", value: percent(ordered, quoteRows.length), note: `${ordered} order${ordered === 1 ? "" : "s"}` },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">How leads are turning into quotes and orders.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{t.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl text-foreground">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-baseline justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Inquiries per week</CardTitle>
            <span className="text-xs text-muted-foreground">{inquiryRows.length} in 12 weeks</span>
          </CardHeader>
          <CardContent>
            <BarChart data={weeklyBuckets(inquiryRows.map((i) => i.created_at), 12)} title="Inquiries per week, last 12 weeks" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-baseline justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Order value per month</CardTitle>
            <span className="text-xs text-muted-foreground">{formatPrice(revenueTotal)} in 6 months</span>
          </CardHeader>
          <CardContent>
            <BarChart data={revenue} title="Order value per month, last 6 months (excluding cancelled)" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Most requested products (12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            {topIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product requests yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-normal">Product</th>
                    <th className="pb-2 text-right font-normal">Units requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topIds.map(([id, qty]) => (
                    <tr key={id}>
                      <td className="py-2 pr-3">
                        <Link href={`/admin/products/${id}`} className="text-foreground hover:underline">
                          {productName.get(id) ?? "Removed product"}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Orders by department (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-normal">Department</th>
                  <th className="pb-2 text-right font-normal">Orders</th>
                  <th className="pb-2 text-right font-normal">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revenueByDepartment.map((d) => (
                  <tr key={d.department}>
                    <td className="py-2 text-foreground">{departmentCopy(d.department).label}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{d.count}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{formatPrice(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
