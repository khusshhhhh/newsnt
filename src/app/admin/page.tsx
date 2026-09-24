import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Inbox,
  Layers,
  MailWarning,
  Package,
  Plus,
  Star,
  Tags,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, roleCan } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BarChart, weeklyBuckets } from "@/components/admin/bar-chart";
import { SystemHealth } from "@/components/admin/system-health";
import { formatPrice } from "@/lib/format";
import { daysAgoIso } from "@/lib/dates";
import { mediaUrl } from "@/lib/supabase/storage";
import { DEPARTMENTS, departmentCopy } from "@/lib/department";
import type { DashboardStats } from "@/lib/supabase/types";

const EMPTY_STATS: DashboardStats = {
  series: 0,
  categories: 0,
  products: 0,
  drafts: 0,
  products_by_department: {},
  new_inquiries: 0,
  customers: 0,
  open_orders: 0,
  pending_reviews: 0,
  pending_photos: 0,
  quotes_awaiting_reply: 0,
  quotes_needing_follow_up: 0,
  failed_notifications: 0,
  errors_24h: 0,
};

export default async function AdminDashboardPage() {
  const { role } = await requireAdmin();
  const supabase = await createClient();
  const sales = roleCan(role, "sales");
  const moderation = roleCan(role, "moderation");

  const eightWeeksAgo = daysAgoIso(8 * 7);
  const [{ data: rawStats }, { data: recentProducts }, { data: recentInquiries }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase
      .from("products")
      .select("id, name, slug, price, currency, is_published, department, product_images(storage_path, display_order)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    sales
      ? supabase.from("inquiries").select("created_at").gte("created_at", eightWeeksAgo)
      : Promise.resolve({ data: [] as { created_at: string }[] }),
  ]);
  const stats = { ...EMPTY_STATS, ...(rawStats ?? {}) };

  const attention = [
    sales && stats.new_inquiries > 0 && {
      label: `${stats.new_inquiries} new inquir${stats.new_inquiries === 1 ? "y" : "ies"}`,
      hint: "Reply while they're warm",
      href: "/admin/inquiries?status=new",
      icon: Inbox,
    },
    sales && stats.quotes_needing_follow_up > 0 && {
      label: `${stats.quotes_needing_follow_up} quote${stats.quotes_needing_follow_up === 1 ? "" : "s"} to follow up`,
      hint: "Sent over a week ago, no reply yet",
      href: "/admin/quotes?filter=follow-up",
      icon: FileText,
    },
    moderation && stats.pending_reviews > 0 && {
      label: `${stats.pending_reviews} review${stats.pending_reviews === 1 ? "" : "s"} to moderate`,
      hint: "Not shown on the site until approved",
      href: "/admin/reviews",
      icon: Star,
    },
    moderation && stats.pending_photos > 0 && {
      label: `${stats.pending_photos} project photo${stats.pending_photos === 1 ? "" : "s"} to moderate`,
      hint: "Customer installs waiting for approval",
      href: "/admin/photos",
      icon: ImageIcon,
    },
    sales && stats.failed_notifications > 0 && {
      label: `${stats.failed_notifications} inquiry email${stats.failed_notifications === 1 ? "" : "s"} failed`,
      hint: "Staff weren't notified — retry from System health",
      href: "#system-health",
      icon: MailWarning,
    },
    stats.errors_24h > 0 && {
      label: `${stats.errors_24h} server error${stats.errors_24h === 1 ? "" : "s"} today`,
      hint: "See System health",
      href: "#system-health",
      icon: AlertTriangle,
    },
  ].filter(Boolean) as { label: string; hint: string; href: string; icon: typeof Inbox }[];

  const catalogStats = [
    { label: "Products", count: stats.products, href: "/admin/products", icon: Package, note: stats.drafts > 0 ? `${stats.drafts} in draft` : null },
    { label: "Series", count: stats.series, href: "/admin/series", icon: Layers, note: null },
    { label: "Categories", count: stats.categories, href: "/admin/categories", icon: Tags, note: null },
  ];

  const inquiryTrend = weeklyBuckets((recentInquiries ?? []).map((i) => i.created_at), 8);
  const inquiriesThisPeriod = inquiryTrend.reduce((sum, w) => sum + w.value, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {attention.length > 0 ? "Here's what needs you today." : "You're all caught up."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sales && (
            <Link href="/admin/quotes/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Plus className="size-4" /> Quote
            </Link>
          )}
          {roleCan(role, "catalog") && (
            <Link href="/admin/products/new" className={buttonVariants({ size: "sm" })} data-admin-new>
              <Plus className="size-4" /> Product
            </Link>
          )}
        </div>
      </div>

      <section className="mt-6" aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="sr-only">
          Needs attention
        </h2>
        {attention.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {attention.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing waiting — no new inquiries, follow-ups or moderation.
          </p>
        )}
      </section>

      {((sales && stats.failed_notifications > 0) || stats.errors_24h > 0) && <SystemHealth role={role} />}

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {sales && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-baseline justify-between">
              <CardTitle className="text-sm font-normal text-muted-foreground">Inquiries per week</CardTitle>
              <span className="text-xs text-muted-foreground">{inquiriesThisPeriod} in the last 8 weeks</span>
            </CardHeader>
            <CardContent>
              <BarChart data={inquiryTrend} title="Inquiries per week, last 8 weeks" height={120} />
              <Link href="/admin/reports" className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground">
                More in Reports →
              </Link>
            </CardContent>
          </Card>
        )}

        <div className={sales ? "grid grid-cols-2 gap-4 lg:grid-cols-1" : "grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4"}>
          {sales && (
            <Link href="/admin/orders">
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="text-sm font-normal text-muted-foreground">Open orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl text-foreground">{stats.open_orders}</p>
                </CardContent>
              </Card>
            </Link>
          )}
          {sales && (
            <Link href="/admin/quotes?filter=awaiting">
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="text-sm font-normal text-muted-foreground">Quotes awaiting reply</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl text-foreground">{stats.quotes_awaiting_reply}</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      <h2 className="mt-10 mb-3 font-heading text-lg text-foreground">Catalog</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {DEPARTMENTS.map((d) => (
          <Link key={d} href={`/admin/products?department=${d}`}>
            <Card className="h-full transition-colors hover:border-foreground/30">
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">{departmentCopy(d).label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl text-foreground">
                  {stats.products_by_department[d] ?? 0}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">products</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {catalogStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-normal text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{stat.count}</p>
                  {stat.note && <p className="text-xs text-muted-foreground">{stat.note}</p>}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">Recent products</h2>
          <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border">
          {recentProducts?.map((p) => {
            const image = [...(p.product_images ?? [])].sort((a, b) => a.display_order - b.display_order)[0];
            return (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}`}
                data-admin-row
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card">
                  {image && <Image src={mediaUrl(image.storage_path)} alt="" fill sizes="48px" className="object-contain p-1.5" />}
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
                  <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                </div>
              </Link>
            );
          })}

          {(!recentProducts || recentProducts.length === 0) && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No products yet.{" "}
              <Link href="/admin/products/new" className="text-foreground underline underline-offset-4">
                Add your first one
              </Link>
              .
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
