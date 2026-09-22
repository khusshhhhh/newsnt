import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InquiryList } from "@/components/admin/inquiry-list";
import { PipelineBoard } from "@/components/admin/pipeline-board";
import { InquiryTrashList } from "@/components/admin/inquiry-trash-list";
import { cn } from "@/lib/utils";
import type { InquiryStatus } from "@/lib/supabase/types";

const STATUSES: InquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];
type View = "list" | "board" | "trash";

function isStatus(value: string): value is InquiryStatus {
  return (STATUSES as string[]).includes(value);
}

function statusHref(status?: InquiryStatus) {
  return status ? `/admin/inquiries?status=${status}` : "/admin/inquiries";
}

function viewHref(view: View) {
  return view === "list" ? "/admin/inquiries" : `/admin/inquiries?view=${view}`;
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { status: rawStatus, view: rawView } = await searchParams;
  const view: View = rawView === "board" ? "board" : rawView === "trash" ? "trash" : "list";
  // The board shows every stage side by side, so a single-status filter
  // doesn't apply there — only the list view honours it.
  const status: InquiryStatus | undefined =
    view === "list" && rawStatus && isStatus(rawStatus) ? rawStatus : undefined;

  const supabase = await createClient();

  const { count: trashCount } = await supabase
    .from("inquiries")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);

  let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  query = view === "trash" ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  if (status) query = query.eq("status", status);
  const { data: inquiries } = await query;

  const productIds = Array.from(
    new Set(
      (inquiries ?? []).flatMap((i) => i.items?.map((item) => item.product_id) ?? i.product_ids ?? [])
    )
  );
  const { data: products } =
    productIds.length > 0 && view !== "trash"
      ? await supabase
          .from("products")
          .select(
            "id, name, slug, department, sku, price, series(name), category:categories(name), product_images(storage_path, display_order), variants:product_variants(id, color_name, sku, price)"
          )
          .in("id", productIds)
      : { data: [] };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-foreground">Inquiries</h1>
        <div className="flex gap-1 rounded-full border border-border p-1 text-sm">
          {(["list", "board", "trash"] as const).map((v) => (
            <Link
              key={v}
              href={viewHref(v)}
              className={cn(
                "rounded-full px-3 py-1.5 capitalize transition-colors",
                view === v
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
              {v === "trash" && trashCount ? ` (${trashCount})` : ""}
            </Link>
          ))}
        </div>
      </div>

      {view === "list" && (
        <div className="mt-4 flex gap-1 rounded-full border border-border p-1 text-sm w-fit">
          {(
            [
              { label: "All", value: undefined },
              { label: "New", value: "new" as const },
              { label: "Contacted", value: "contacted" as const },
              { label: "Quoted", value: "quoted" as const },
              { label: "Won", value: "won" as const },
              { label: "Lost", value: "lost" as const },
            ] satisfies { label: string; value: InquiryStatus | undefined }[]
          ).map((tab) => (
            <Link
              key={tab.label}
              href={statusHref(tab.value)}
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
      )}

      <div className="mt-6">
        {view === "board" ? (
          <PipelineBoard inquiries={inquiries ?? []} products={products ?? []} />
        ) : view === "trash" ? (
          <InquiryTrashList inquiries={inquiries ?? []} />
        ) : (
          <InquiryList inquiries={inquiries ?? []} products={products ?? []} />
        )}
      </div>
    </div>
  );
}
