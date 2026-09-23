import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { DepartmentTabs } from "@/components/admin/department-tabs";
import { ProductSearchBox } from "@/components/admin/product-search-box";
import { ProductFilters } from "@/components/admin/product-filters";
import { ProductList } from "@/components/admin/product-list";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { cn } from "@/lib/utils";
import { ilikeContainsPattern } from "@/lib/search";
import { isDepartment, type Department } from "@/lib/department";
import type { StockStatus } from "@/lib/supabase/types";

type StatusFilter = "published" | "draft";
const STOCK_STATUSES: StockStatus[] = ["in_stock", "made_to_order", "out_of_stock", "discontinued"];

function isStatusFilter(value: string): value is StatusFilter {
  return value === "published" || value === "draft";
}

function isStockStatus(value: string): value is StockStatus {
  return (STOCK_STATUSES as string[]).includes(value);
}

function buildHref(
  basePath: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    department?: string;
    q?: string;
    status?: string;
    series?: string;
    category?: string;
    finish?: string;
    stock?: string;
  }>;
}) {
  const {
    department: rawDepartment,
    q: rawQuery,
    status: rawStatus,
    series: seriesId,
    category: categoryId,
    finish,
    stock: rawStock,
  } = await searchParams;
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;
  const q = rawQuery?.trim() ?? "";
  const status: StatusFilter | undefined = rawStatus && isStatusFilter(rawStatus) ? rawStatus : undefined;
  const stock: StockStatus | undefined = rawStock && isStockStatus(rawStock) ? rawStock : undefined;
  const currentParams = {
    department,
    q,
    status,
    series: seriesId,
    category: categoryId,
    finish,
    stock,
  };

  const supabase = await createClient();

  const [{ data: seriesOptions }, { data: categoryOptions }, { data: finishOptions }] =
    await Promise.all([
      department
        ? supabase.from("series").select("id, name").eq("department", department).order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      department
        ? supabase.from("categories").select("id, name").eq("department", department).order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.from("finishes").select("id, name").order("display_order"),
    ]);

  let productIdsForFinish: string[] | null = null;
  if (finish) {
    const { data: variantRows } = await supabase
      .from("product_variants")
      .select("product_id")
      .eq("color_name", finish);
    productIdsForFinish = Array.from(new Set((variantRows ?? []).map((v) => v.product_id)));
  }

  let query = supabase
    .from("products")
    .select(
      "*, series(name), category:categories(name), product_images(storage_path, display_order)"
    )
    .order("created_at", { ascending: false });
  if (department) query = query.eq("department", department);
  if (status) query = query.eq("is_published", status === "published");
  const pattern = ilikeContainsPattern(q);
  if (pattern) query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  if (seriesId) query = query.eq("series_id", seriesId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (stock) query = query.eq("stock_status", stock);
  if (productIdsForFinish) query = query.in("id", productIdsForFinish);
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
                href={buildHref("/admin/products", currentParams, { status: tab.value })}
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

      <div className="mt-3">
        <ProductFilters
          seriesOptions={(seriesOptions ?? []).map((s) => ({ value: s.id, label: s.name }))}
          categoryOptions={(categoryOptions ?? []).map((c) => ({ value: c.id, label: c.name }))}
          finishOptions={(finishOptions ?? []).map((f) => ({ value: f.name, label: f.name }))}
        />
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
