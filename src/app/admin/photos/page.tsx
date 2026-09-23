import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectPhotoList } from "@/components/admin/project-photo-list";
import { cn } from "@/lib/utils";
import { BulkModerate } from "@/components/admin/bulk-moderate";
import { Pagination } from "@/components/pagination";
import { buildHref, pageCount, pageRange, parsePage } from "@/lib/admin-list";
import type { ModerationStatus } from "@/lib/supabase/types";

const STATUSES: ModerationStatus[] = ["pending", "approved", "rejected"];

function isStatus(value: string): value is ModerationStatus {
  return (STATUSES as string[]).includes(value);
}

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: rawStatus, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const status: ModerationStatus = rawStatus && isStatus(rawStatus) ? rawStatus : "pending";

  const supabase = await createClient();
  const { data: photos, count } = await supabase
    .from("project_photos")
    .select("*, series(name)", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(...pageRange(page));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-foreground">Project photos</h1>
        {status === "pending" && <BulkModerate kind="project_photo" ids={(photos ?? []).map((r) => r.id)} />}
      </div>

      <div className="mt-4 flex gap-1 rounded-full border border-border p-1 text-sm w-fit">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/photos?status=${s}`}
            className={cn(
              "rounded-full px-3 py-1.5 capitalize transition-colors",
              status === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <ProjectPhotoList photos={photos ?? []} />
      </div>
      <Pagination
        page={page}
        pageCount={pageCount(count)}
        buildHref={(p) => buildHref("/admin/photos", { status }, { page: p > 1 ? String(p) : undefined })}
      />
    </div>
  );
}
