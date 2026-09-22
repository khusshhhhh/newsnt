import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InquiryList } from "@/components/admin/inquiry-list";
import { cn } from "@/lib/utils";
import type { InquiryStatus } from "@/lib/supabase/types";

const STATUSES: InquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];

function isStatus(value: string): value is InquiryStatus {
  return (STATUSES as string[]).includes(value);
}

function statusHref(status?: InquiryStatus) {
  return status ? `/admin/inquiries?status=${status}` : "/admin/inquiries";
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status: InquiryStatus | undefined = rawStatus && isStatus(rawStatus) ? rawStatus : undefined;

  const supabase = await createClient();
  let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: inquiries } = await query;

  const productIds = Array.from(
    new Set(
      (inquiries ?? []).flatMap((i) => i.items?.map((item) => item.product_id) ?? i.product_ids ?? [])
    )
  );
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select(
            "id, name, slug, department, sku, price, series(name), category:categories(name), product_images(storage_path, display_order), variants:product_variants(id, color_name, sku, price)"
          )
          .in("id", productIds)
      : { data: [] };

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Inquiries</h1>

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

      <div className="mt-6">
        <InquiryList inquiries={inquiries ?? []} products={products ?? []} />
      </div>
    </div>
  );
}
