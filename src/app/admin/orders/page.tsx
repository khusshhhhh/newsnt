import { createClient } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/admin/orders-board";

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*, customer:customers(name, email, phone)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag a card between columns, or open it to see the full order and update its stage.
      </p>

      <div className="mt-6">
        <OrdersBoard orders={orders ?? []} />
      </div>
    </div>
  );
}
