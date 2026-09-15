import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: seriesCount }, { count: categoryCount }, { count: productCount }] =
    await Promise.all([
      supabase.from("series").select("*", { count: "exact", head: true }),
      supabase.from("categories").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Series", count: seriesCount ?? 0, href: "/admin/series" },
    { label: "Categories", count: categoryCount ?? 0, href: "/admin/categories" },
    { label: "Products", count: productCount ?? 0, href: "/admin/products" },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage the Aakar catalog.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl text-foreground">{stat.count}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
