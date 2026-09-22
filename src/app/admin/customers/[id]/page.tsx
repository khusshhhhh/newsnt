import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerNotes } from "@/components/admin/customer-notes";
import { QuoteHistory } from "@/components/admin/quote-history";
import { QuoteDialog } from "@/components/admin/quote-dialog";
import { resolveInquiryLines, type AdminInquiryProduct } from "@/lib/inquiry-lines";
import { departmentCopy } from "@/lib/department";
import { formatPrice } from "@/lib/format";
import type { Inquiry, InquiryStatus, OrderStatus } from "@/lib/supabase/types";

const STATUS_VARIANT: Record<InquiryStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "outline",
  contacted: "secondary",
  quoted: "default",
  won: "default",
  lost: "destructive",
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: "Confirmed",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) notFound();

  const [{ data: notes }, { data: inquiries }, { data: quotes }, { data: orders }] = await Promise.all([
    supabase
      .from("customer_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("inquiries")
      .select("*")
      .eq("customer_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").eq("customer_id", id).order("sent_at", { ascending: false }),
    supabase.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);

  const productIds = Array.from(
    new Set((inquiries ?? []).flatMap((i) => i.items?.map((item) => item.product_id) ?? i.product_ids ?? []))
  );
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select(
            "id, name, slug, department, sku, price, series(name), category:categories(name), product_images(storage_path, display_order), variants:product_variants(id, color_name, sku, price)"
          )
          .in("id", productIds)
      : { data: [] as AdminInquiryProduct[] };
  const productsById = new Map((products ?? []).map((p) => [p.id, p as AdminInquiryProduct]));

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Customers
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl text-foreground">{customer.name}</h1>
            {customer.department && (
              <Badge variant="secondary">{departmentCopy(customer.department).shortLabel}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Customer since {new Date(customer.created_at).toLocaleDateString()} · last active{" "}
            {new Date(customer.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerNotes customerId={customer.id} notes={notes ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotes sent</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteHistory
              quotes={quotes ?? []}
              customerId={customer.id}
              customerName={customer.name}
              department={customer.department}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No orders yet — mark a quote &quot;Won&quot; from Inquiries to convert it into an order.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {inquiries && inquiries.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {inquiries.map((inquiry) => (
                  <InquiryHistoryItem key={inquiry.id} inquiry={inquiry} productsById={productsById} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No inquiries yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InquiryHistoryItem({
  inquiry,
  productsById,
}: {
  inquiry: Inquiry;
  productsById: Map<string, AdminInquiryProduct>;
}) {
  const lines = resolveInquiryLines(inquiry, productsById);

  return (
    <li className="rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {new Date(inquiry.created_at).toLocaleString()}
        </span>
        <Badge variant={STATUS_VARIANT[inquiry.status]} className="capitalize">
          {inquiry.status}
        </Badge>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{inquiry.message}</p>
      {lines.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {lines.map((line, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              {line.name}
              {line.variantLabel ? ` (${line.variantLabel})` : ""} × {line.quantity}
              {line.unitPrice != null ? ` — ${formatPrice(line.unitPrice)}` : ""}
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <div className="mt-2 flex justify-end">
          <QuoteDialog
            inquiryId={inquiry.id}
            customerName={inquiry.name}
            customerEmail={inquiry.email}
            lines={lines}
          />
        </div>
      )}
    </li>
  );
}
