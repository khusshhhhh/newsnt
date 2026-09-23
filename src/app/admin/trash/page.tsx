import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, roleCan } from "@/lib/admin-guard";
import { Badge } from "@/components/ui/badge";
import { TrashActions } from "@/components/admin/trash-actions";
import { purgeProduct, restoreProducts } from "@/lib/actions/admin/products";
import { purgeSeries, restoreSeries } from "@/lib/actions/admin/series";
import { restoreCustomer } from "@/lib/actions/admin/customers";
import { departmentCopy } from "@/lib/department";

export const metadata = { title: "Trash" };

function deletedOn(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TrashPage() {
  const { role } = await requireAdmin();
  const supabase = await createClient();
  const catalog = roleCan(role, "catalog");
  const sales = roleCan(role, "sales");

  const [{ data: products }, { data: series }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, department, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("series")
      .select("id, name, department, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    sales
      ? supabase
          .from("customers")
          .select("id, name, email, deleted_at")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; name: string; email: string; deleted_at: string | null }[] }),
  ]);

  const sections = [
    {
      title: "Products",
      rows: (products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        meta: departmentCopy(p.department).shortLabel,
        deletedAt: p.deleted_at!,
        restore: catalog ? restoreProducts.bind(null, [p.id]) : null,
        purge: catalog ? purgeProduct.bind(null, p.id) : undefined,
      })),
    },
    {
      title: "Series",
      rows: (series ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        meta: departmentCopy(s.department).shortLabel,
        deletedAt: s.deleted_at!,
        restore: catalog ? restoreSeries.bind(null, s.id) : null,
        purge: catalog ? purgeSeries.bind(null, s.id) : undefined,
      })),
    },
    ...(sales
      ? [
          {
            title: "Customers",
            rows: (customers ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              meta: c.email,
              deletedAt: c.deleted_at!,
              restore: restoreCustomer.bind(null, c.id),
              purge: undefined,
            })),
          },
        ]
      : []),
  ];
  const empty = sections.every((s) => s.rows.length === 0);

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Trash</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Deleted products, series and customers land here first. Restoring brings them back as drafts. Trashed
        inquiries live in{" "}
        <Link href="/admin/inquiries?view=trash" className="text-foreground underline underline-offset-4">
          Inquiries → Trash
        </Link>
        .
      </p>

      {empty ? (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Trash is empty.
        </p>
      ) : (
        sections
          .filter((s) => s.rows.length > 0)
          .map((section) => (
            <section key={section.title} className="mt-8">
              <h2 className="mb-3 font-heading text-lg text-foreground">
                {section.title} <span className="text-sm text-muted-foreground">({section.rows.length})</span>
              </h2>
              <div className="divide-y divide-border rounded-xl border border-border">
                {section.rows.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-foreground">{row.name}</span>
                        <Badge variant="secondary">{row.meta}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Deleted {deletedOn(row.deletedAt)}</p>
                    </div>
                    {row.restore && <TrashActions name={row.name} restore={row.restore} purge={row.purge} />}
                  </div>
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
