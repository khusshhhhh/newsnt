import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { isDepartment, type Department } from "@/lib/department";

const EXPORT_HEADERS = [
  "name",
  "slug",
  "sku",
  "department",
  "category",
  "series",
  "price",
  "is_featured",
  "is_published",
  "display_order",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDepartment = searchParams.get("department");
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "name, slug, sku, department, price, is_featured, is_published, display_order, category:categories(name), series(name)"
    )
    .order("created_at", { ascending: false });
  if (department) query = query.eq("department", department);

  const { data: products, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (products ?? []).map((p) => ({
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? "",
    department: p.department,
    category: p.category?.name ?? "",
    series: p.series?.name ?? "",
    price: p.price ?? "",
    is_featured: p.is_featured,
    is_published: p.is_published,
    display_order: p.display_order,
  }));

  const csv = toCsv(rows, EXPORT_HEADERS);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${department ?? "all"}.csv"`,
    },
  });
}
