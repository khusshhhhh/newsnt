import Link from "next/link";
import { KanbanSquare, List } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/admin/orders-board";
import { ORDER_STAGES } from "@/lib/order-stages";
import { AdminSearchBox } from "@/components/admin/admin-search-box";
import { Pagination } from "@/components/pagination";
import { ilikeContainsPattern } from "@/lib/search";
import { daysAgoIso } from "@/lib/dates";
import { buildHref, pageCount, pageRange, parsePage } from "@/lib/admin-list";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/supabase/types";

type View = "board" | "list";

function isStage(value: string | undefined): value is OrderStatus {
  return ORDER_STAGES.some((s) => s.value === value);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; status?: string; page?: string }>;
}) {
  const { q: rawQuery, view: rawView, status: rawStatus, page: rawPage } = await searchParams;
  const q = rawQuery?.trim() ?? "";
  const view: View = rawView === "list" ? "list" : "board";
  // The board shows every stage side by side, so the stage filter and
  // paging only apply to the list.
  const status = view === "list" && isStage(rawStatus) ? rawStatus : undefined;
  const page = view === "list" ? parsePage(rawPage) : 1;
  const current = { view: view === "list" ? "list" : undefined, status, q: q || undefined };
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*, customer:customers(name, email, phone)", { count: view === "list" ? "exact" : undefined })
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
  } else if (view === "board") {
    // Delivered/cancelled orders drop off the board after 90 days so it
    // stays fast; the list and a search still find them.
    query = query.or(`status.not.in.(delivered,cancelled),updated_at.gte.${daysAgoIso(90)}`);
  }
  if (status) query = query.eq("status", status);
  if (view === "list") query = query.range(...pageRange(page));
  const { data: orders, count } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-foreground">Orders</h1>
        <div className="flex gap-1 rounded-full border border-border p-1 text-sm" role="tablist" aria-label="Orders view">
          {(
            [
              { value: "board", label: "Board", icon: KanbanSquare },
              { value: "list", label: "List", icon: List },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <Link
              key={value}
              href={buildHref("/admin/orders", { q: q || undefined }, { view: value === "list" ? "list" : undefined })}
              role="tab"
              aria-selected={view === value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
                view === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {view === "board"
          ? "Drag a card between columns, or open it for items, discount, payment and invoices."
          : "Every order, newest first. Change a stage inline or open an order for the details."}
        {view === "board" && !q && " Finished orders older than 90 days are hidden — search or use the list to find them."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {view === "list" ? (
          <div className="flex w-fit flex-wrap gap-1 rounded-full border border-border p-1 text-sm">
            {[{ value: undefined, label: "All" }, ...ORDER_STAGES].map((stage) => (
              <Link
                key={stage.label}
                href={buildHref("/admin/orders", current, { status: stage.value, page: undefined })}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  status === stage.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {stage.label}
              </Link>
            ))}
          </div>
        ) : (
          <span />
        )}
        <AdminSearchBox initialQuery={q} placeholder="Order number or customer…" label="Search orders" />
      </div>

      <div className="mt-6">
        <OrdersBoard key={`${view}-${q}-${status ?? ""}-${page}`} orders={orders ?? []} view={view} />
      </div>
      {view === "list" && (
        <Pagination
          page={page}
          pageCount={pageCount(count)}
          buildHref={(p) => buildHref("/admin/orders", current, { page: p > 1 ? String(p) : undefined })}
        />
      )}
    </div>
  );
}
