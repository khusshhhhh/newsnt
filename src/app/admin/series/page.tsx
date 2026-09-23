import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { DepartmentTabs } from "@/components/admin/department-tabs";
import { deleteSeries, restoreSeries } from "@/lib/actions/admin/series";
import { departmentCopy, isDepartment, seriesHref, type Department } from "@/lib/department";

export default async function AdminSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department: rawDepartment } = await searchParams;
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;

  const supabase = await createClient();
  let query = supabase.from("series").select("*").is("deleted_at", null).order("display_order", { ascending: true });
  if (department) query = query.eq("department", department);
  const { data: series } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl text-foreground">Series</h1>
        <Link
          href={department ? `/admin/series/new?department=${department}` : "/admin/series/new"}
          className={buttonVariants()}
          data-admin-new
        >
          New series
        </Link>
      </div>

      <div className="mt-4">
        <DepartmentTabs basePath="/admin/series" active={department} />
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {series?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-foreground">{s.name}</span>
              <span className="text-xs text-muted-foreground">/{s.slug}</span>
              <Badge variant="secondary">{departmentCopy(s.department).shortLabel}</Badge>
              {!s.is_published && <Badge variant="secondary">Draft</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {s.is_published && (
                <a
                  href={seriesHref(s)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ${s.name} on the site`}
                  title="View on site"
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              <Link
                href={`/admin/series/${s.id}`}
                data-admin-row
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit
              </Link>
              <DeleteButton
                action={deleteSeries.bind(null, s.id)}
                undo={restoreSeries.bind(null, s.id)}
                label="Delete series"
                itemName={s.name}
              />
            </div>
          </div>
        ))}

        {(!series || series.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No series yet.{" "}
            <Link href="/admin/series/new" className="text-foreground underline underline-offset-4">
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
