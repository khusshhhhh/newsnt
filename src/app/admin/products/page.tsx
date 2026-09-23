import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { DepartmentTabs } from "@/components/admin/department-tabs";
import { ProductSearchBox } from "@/components/admin/product-search-box";
import { ProductFilters } from "@/components/admin/product-filters";
import { ProductList } from "@/components/admin/product-list";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { Pagination } from "@/components/pagination";
import { cn } from "@/lib/utils";
import { ilikeContainsPattern } from "@/lib/search";
import { buildHref, pageCount, pageRange, parsePage } from "@/lib/admin-list";
import { PRODUCT_SORTS, isProductSort, type ProductSort } from "@/lib/product-sorts";
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
    sort?: string;
    page?: string;
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
    sort: rawSort,
    page: rawPage,
  } = await searchParams;
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;
  const q = rawQuery?.trim() ?? "";
  const status: StatusFilter | undefined = rawStatus && isStatusFilter(rawStatus) ? rawStatus : undefined;
  const stock: StockStatus | undefined = rawStock && isStockStatus(rawStock) ? rawStock : undefined;
  const sort: ProductSort = rawSort && isProductSort(rawSort) ? rawSort : "newest";
  const page = parsePage(rawPage);
  const currentParams = {
    department,
    q,
    status,
    series: seriesId,
    category: categoryId,
    finish,
    stock,
    sort: sort === "newest" ? undefined : sort,
  };

  const supabase = await createClient();

  const [{ data: seriesOptions }, { data: categoryOptions }, { data: finishOptions }, { count: trashCount }] =
    await Promise.all([
      department
        ? supabase.from("series").select("id, name").eq("department", department).is("deleted_at", null).order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.from("categories").select("id, name, department").order("name"),
      supabase.from("finishes").select("id, name").order("display_order"),
      supabase.from("products").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    ]);

  let productIdsForFinish: string[] | null = null;
  if (finish) {
    const { data: variantRows } = await supabase
      .from("product_variants")
      .select("product_id")
      .eq("color_name", finish);
    productIdsForFinish = Array.from(new Set((variantRows ?? []).map((v) => v.product_id)));
  }

  const { column, ascending } = PRODUCT_SORTS[sort];
  let query = supabase
    .from("products")
    .select("*, series(name), category:categories(name), product_images(storage_path, display_order)", {
      count: "exact",
    })
    .is("deleted_at", null)
    .order(column, { ascending, nullsFirst: false })
    .order("id");
  if (department) query = query.eq("department", department);
  if (status) query = query.eq("is_published", status === "published");
  const pattern = ilikeContainsPattern(q);
  if (pattern) query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  if (seriesId) query = query.eq("series_id", seriesId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (stock) query = query.eq("stock_status", stock);
  if (productIdsForFinish) query = query.in("id", productIdsForFinish);
  const [from, to] = pageRange(page);
  const { data: products, count } = await query.range(from, to);

  const departmentCategories = (categoryOptions ?? []).filter((c) => !department || c.department === department);
  const sortHrefs = Object.fromEntries(
    (Object.keys(PRODUCT_SORTS) as ProductSort[]).map((s) => [
      s,
      buildHref("/admin/products", currentParams, { sort: s === "newest" ? undefined : s }),
    ])
  ) as Record<ProductSort, string>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count ?? 0} product{count === 1 ? "" : "s"}
            {(trashCount ?? 0) > 0 && (
              <>
                {" · "}
                <Link href="/admin/trash" className="hover:text-foreground hover:underline">
                  {trashCount} in trash
                </Link>
              </>
            )}
          </p>
        </div>
        <Link
          href={department ? `/admin/products/new?department=${department}` : "/admin/products/new"}
          className={buttonVariants()}
          data-admin-new
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
                  status === tab.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
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
          categoryOptions={departmentCategories.map((c) => ({ value: c.id, label: c.name }))}
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
        <ProductList
          products={products ?? []}
          sort={sort}
          sortHrefs={sortHrefs}
          categories={categoryOptions ?? []}
          hasFilters={Boolean(q || status || seriesId || categoryId || finish || stock || department)}
        />
        <Pagination
          page={page}
          pageCount={pageCount(count)}
          buildHref={(p) => buildHref("/admin/products", currentParams, { page: p > 1 ? String(p) : undefined })}
        />
      </div>
    </div>
  );
}
