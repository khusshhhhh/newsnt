"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { deleteProjectPhoto, moderateProjectPhoto } from "@/lib/actions/admin/moderation";
import { departmentCopy } from "@/lib/department";
import { mediaUrl } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import type { ProjectPhoto } from "@/lib/supabase/types";

type PhotoRow = ProjectPhoto & { series: { name: string } | null };

export function ProjectPhotoList({ photos }: { photos: PhotoRow[] }) {
  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}

function PhotoCard({ photo }: { photo: PhotoRow }) {
  const [isPending, startTransition] = useTransition();

  function act(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="relative aspect-video w-full bg-muted">
        <Image
          src={mediaUrl(photo.storage_path)}
          alt={photo.caption ?? ""}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="p-3">
        <p className="text-sm text-foreground">{photo.caption || "Untitled"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {photo.submitter_name} · {departmentCopy(photo.department).shortLabel}
          {photo.series ? ` · ${photo.series.name}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {photo.status !== "approved" && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => act(() => moderateProjectPhoto(photo.id, "approved"), "Photo approved")}
            >
              Approve
            </Button>
          )}
          {photo.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => act(() => moderateProjectPhoto(photo.id, "rejected"), "Photo rejected")}
            >
              Reject
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => act(() => deleteProjectPhoto(photo.id), "Photo deleted")}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
