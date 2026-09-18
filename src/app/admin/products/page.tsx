import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { DepartmentTabs } from "@/components/admin/department-tabs";
import { ProductSearchBox } from "@/components/admin/product-search-box";
import { ProductList } from "@/components/admin/product-list";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { cn } from "@/lib/utils";
import { isDepartment, type Department } from "@/lib/department";

type StatusFilter = "published" | "draft";

function isStatusFilter(value: string): value is StatusFilter {
  return value === "published" || value === "draft";
}

function statusHref(basePath: string, department?: Department, q?: string, status?: StatusFilter) {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; q?: string; status?: string }>;
}) {
  const { department: rawDepartment, q: rawQuery, status: rawStatus } = await searchParams;
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;
  const q = rawQuery?.trim() ?? "";
  const status: StatusFilter | undefined = rawStatus && isStatusFilter(rawStatus) ? rawStatus : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "*, series(name), category:categories(name), product_images(storage_path, display_order)"
    )
    .order("created_at", { ascending: false });
  if (department) query = query.eq("department", department);
  if (status) query = query.eq("is_published", status === "published");
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  const { data: products } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl text-foreground">Products</h1>
        <Link
          href={
            department ? `/admin/products/new?department=${department}` : "/admin/products/new"
          }
          className={buttonVariants()}
        >
          New product
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DepartmentTabs basePath="/admin/products" active={department} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full border border-border p-1 text-sm">
            {(
              [
                { label: "All", value: undefined },
                { label: "Published", value: "published" as const },
                { label: "Draft", value: "draft" as const },
              ] satisfies { label: string; value: StatusFilter | undefined }[]
            ).map((tab) => (
              <Link
                key={tab.label}
                href={statusHref("/admin/products", department, q, tab.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  status === tab.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <ProductSearchBox initialQuery={q} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
        <CsvImportForm />
        <a
          href={department ? `/admin/products/export?department=${department}` : "/admin/products/export"}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
        >
          <Download className="size-4" />
          Export CSV
        </a>
      </div>

      <div className="mt-6">
        <ProductList products={products ?? []} />
      </div>
    </div>
  );
}
