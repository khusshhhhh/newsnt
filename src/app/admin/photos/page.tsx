import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectPhotoList } from "@/components/admin/project-photo-list";
import { cn } from "@/lib/utils";
import type { ModerationStatus } from "@/lib/supabase/types";

const STATUSES: ModerationStatus[] = ["pending", "approved", "rejected"];

function isStatus(value: string): value is ModerationStatus {
  return (STATUSES as string[]).includes(value);
}

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status: ModerationStatus = rawStatus && isStatus(rawStatus) ? rawStatus : "pending";

  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("project_photos")
    .select("*, series(name)")
    .eq("status", status)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Project photos</h1>

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
    </div>
  );
}
