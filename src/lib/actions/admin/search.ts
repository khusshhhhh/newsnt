"use server";

import { z } from "zod";
import { requireAdmin, roleCan } from "@/lib/admin-guard";
import { ilikeContainsPattern } from "@/lib/search";

export type AdminSearchResult = {
  type: "product" | "customer" | "quote" | "order" | "inquiry";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** Ctrl+K palette search across the admin panel — only the sections the admin's role can see. */
export async function adminGlobalSearch(rawQuery: string): Promise<AdminSearchResult[]> {
  const parsed = z.string().trim().min(2).max(100).safeParse(rawQuery);
  if (!parsed.success) return [];
  const pattern = ilikeContainsPattern(parsed.data);
  if (!pattern) return [];

  const { supabase, role } = await requireAdmin();
  const sales = roleCan(role, "sales");
  const results: AdminSearchResult[] = [];

  const [products, customers, quotes, orders, inquiries] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, is_published")
      .is("deleted_at", null)
      .or(`name.ilike.${pattern},sku.ilike.${pattern}`)
      .limit(5),
    sales
      ? supabase
          .from("customers")
          .select("id, name, email")
          .is("deleted_at", null)
          .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(5)
      : Promise.resolve({ data: [] as { id: string; name: string; email: string }[] }),
    sales
      ? supabase.from("quotes").select("id, quote_number, status").ilike("quote_number", pattern).limit(5)
      : Promise.resolve({ data: [] as { id: string; quote_number: string; status: string }[] }),
    sales
      ? supabase.from("orders").select("id, order_number, status").ilike("order_number", pattern).limit(5)
      : Promise.resolve({ data: [] as { id: string; order_number: string; status: string }[] }),
    sales
      ? supabase
          .from("inquiries")
          .select("id, name, email, status")
          .is("deleted_at", null)
          .or(`name.ilike.${pattern},email.ilike.${pattern}`)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as { id: string; name: string; email: string; status: string }[] }),
  ]);

  for (const p of products.data ?? []) {
    results.push({
      type: "product",
      id: p.id,
      title: p.name,
      subtitle: [p.sku, p.is_published ? "Published" : "Draft"].filter(Boolean).join(" · "),
      href: `/admin/products/${p.id}`,
    });
  }
  for (const c of customers.data ?? []) {
    results.push({ type: "customer", id: c.id, title: c.name, subtitle: c.email, href: `/admin/customers/${c.id}` });
  }
  for (const i of inquiries.data ?? []) {
    results.push({
      type: "inquiry",
      id: i.id,
      title: i.name,
      subtitle: `Inquiry · ${i.status} · ${i.email}`,
      href: `/admin/inquiries?q=${encodeURIComponent(i.email)}`,
    });
  }
  for (const q of quotes.data ?? []) {
    results.push({ type: "quote", id: q.id, title: q.quote_number, subtitle: `Quote · ${q.status}`, href: `/admin/quotes?q=${encodeURIComponent(q.quote_number)}` });
  }
  for (const o of orders.data ?? []) {
    results.push({ type: "order", id: o.id, title: o.order_number, subtitle: `Order · ${o.status.replace(/_/g, " ")}`, href: `/admin/orders?q=${encodeURIComponent(o.order_number)}` });
  }
  return results;
}
