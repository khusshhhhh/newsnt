import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteSeries } from "@/app/admin/actions";

export default async function AdminSeriesPage() {
  const supabase = await createClient();
  const { data: series } = await supabase
    .from("series")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">Series</h1>
        <Link href="/admin/series/new" className={buttonVariants()}>
          New series
        </Link>
      </div>

      <div className="mt-8 divide-y divide-border/70 rounded-xl border border-border/70">
        {series?.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-foreground">{s.name}</span>
              <span className="text-xs text-muted-foreground">/{s.slug}</span>
              {!s.is_published && <Badge variant="secondary">Draft</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/series/${s.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit
              </Link>
              <DeleteButton action={deleteSeries.bind(null, s.id)} label="Delete series" />
            </div>
          </div>
        ))}

        {(!series || series.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No series yet.
          </p>
        )}
      </div>
    </div>
  );
}
