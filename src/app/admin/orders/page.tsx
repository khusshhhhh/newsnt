import { createClient } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/admin/orders-board";
import { AdminSearchBox } from "@/components/admin/admin-search-box";
import { ilikeContainsPattern } from "@/lib/search";
import { daysAgoIso } from "@/lib/dates";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQuery } = await searchParams;
  const q = rawQuery?.trim() ?? "";
  const supabase = await createClient();

  // Delivered/cancelled orders drop off the board after 90 days so it stays
  // fast; a search still finds them.
  let query = supabase
    .from("orders")
    .select("*, customer:customers(name, email, phone)")
    .order("created_at", { ascending: false });
  const pattern = ilikeContainsPattern(q);
  if (pattern) {
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(50);
    const ids = (matchingCustomers ?? []).map((c) => c.id);
    query = query.or(
      ids.length > 0 ? `order_number.ilike.${pattern},customer_id.in.(${ids.join(",")})` : `order_number.ilike.${pattern}`
    );
  } else {
    query = query.or(`status.not.in.(delivered,cancelled),updated_at.gte.${daysAgoIso(90)}`);
  }
  const { data: orders } = await query;

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Orders</h1>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="mt-1 text-sm text-muted-foreground">
          Drag a card between columns, or open it for items, payment and invoices.
          {!q && " Finished orders older than 90 days are hidden — search to find them."}
        </p>
        <AdminSearchBox initialQuery={q} placeholder="Order number or customer…" label="Search orders" />
      </div>

      <div className="mt-6">
        <OrdersBoard key={q} orders={orders ?? []} />
      </div>
    </div>
  );
}
