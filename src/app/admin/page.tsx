import Image from "next/image";
import Link from "next/link";
import { Layers, Package, Plus, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/storage";
import { DEPARTMENTS, departmentCopy } from "@/lib/department";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: seriesCount },
    { count: categoryCount },
    { count: productCount },
    { count: draftCount },
    { data: recentProducts },
    ...departmentCounts
  ] = await Promise.all([
    supabase.from("series").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_published", false),
    supabase
      .from("products")
      .select("id, name, slug, price, currency, is_published, department, product_images(storage_path, display_order)")
      .order("created_at", { ascending: false })
      .limit(5),
    ...DEPARTMENTS.map((d) =>
      supabase.from("products").select("*", { count: "exact", head: true }).eq("department", d)
    ),
  ]);

  const stats = [
    { label: "Products", count: productCount ?? 0, href: "/admin/products", icon: Package },
    { label: "Series", count: seriesCount ?? 0, href: "/admin/series", icon: Layers },
    { label: "Categories", count: categoryCount ?? 0, href: "/admin/categories", icon: Tags },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the Aakar catalog.
            {(draftCount ?? 0) > 0 && ` ${draftCount} product${draftCount === 1 ? "" : "s"} still in draft.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/series/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus className="size-4" /> Series
          </Link>
          <Link href="/admin/categories/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus className="size-4" /> Category
          </Link>
          <Link href="/admin/products/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" /> Product
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DEPARTMENTS.map((d, i) => (
          <Link key={d} href={`/admin/products?department=${d}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">
                  {departmentCopy(d).label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl text-foreground">
                  {departmentCounts[i]?.count ?? 0}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">products</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl text-foreground">{stat.count}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">Recent products</h2>
          <Link
            href="/admin/products"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border">
          {recentProducts?.map((p) => {
            const image = [...(p.product_images ?? [])].sort(
              (a, b) => a.display_order - b.display_order
            )[0];
            return (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {image && (
                    <Image
                      src={mediaUrl(image.storage_path)}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">{p.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {departmentCopy(p.department).shortLabel}
                    </Badge>
                    {!p.is_published && (
                      <Badge variant="secondary" className="shrink-0">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(p.price, p.currency)}
                  </p>
                </div>
              </Link>
            );
          })}

          {(!recentProducts || recentProducts.length === 0) && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No products yet — add your first one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
