import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { DepartmentTabs } from "@/components/admin/department-tabs";
import { deleteProduct } from "@/lib/actions/admin/products";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { departmentCopy, isDepartment, type Department } from "@/lib/department";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department: rawDepartment } = await searchParams;
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "*, series(name), category:categories(name), product_images(storage_path, display_order)"
    )
    .order("created_at", { ascending: false });
  if (department) query = query.eq("department", department);
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

      <div className="mt-4">
        <DepartmentTabs basePath="/admin/products" active={department} />
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {products?.map((p) => {
          const image = [...(p.product_images ?? [])].sort(
            (a, b) => a.display_order - b.display_order
          )[0];
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card">
                  {image && (
                    <Image
                      src={mediaUrl(image.storage_path)}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-foreground">{p.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {departmentCopy(p.department).shortLabel}
                    </Badge>
                    {!p.is_published && <Badge variant="secondary">Draft</Badge>}
                    {p.is_featured && <Badge>Featured</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.category?.name}
                    {p.series?.name ? ` · ${p.series.name}` : ""} ·{" "}
                    {formatPrice(p.price)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/products/${p.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Edit
                </Link>
                <DeleteButton
                  action={deleteProduct.bind(null, p.id)}
                  label="Delete product"
                />
              </div>
            </div>
          );
        })}

        {(!products || products.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No products yet.
          </p>
        )}
      </div>
    </div>
  );
}
