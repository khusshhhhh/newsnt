"use client";

import { useActionState } from "react";
import { upsertSeries } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { DepartmentField } from "@/components/admin/department-field";
import type { Series } from "@/lib/supabase/types";
import type { Department } from "@/lib/department";

export function SeriesForm({
  series,
  images = [],
  defaultDepartment = "sanitary-tapware",
}: {
  series?: Series;
  images?: string[];
  defaultDepartment?: Department;
}) {
  const [state, formAction, pending] = useActionState(upsertSeries, null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {series && <input type="hidden" name="id" value={series.id} />}

      <DepartmentField defaultValue={series?.department ?? defaultDepartment} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={series?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={series?.slug}
          placeholder="auto-generated from name if left blank"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="design_story">Design story</Label>
        <Textarea
          id="design_story"
          name="design_story"
          rows={4}
          defaultValue={series?.design_story ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Hero images</Label>
        <p className="text-xs text-muted-foreground">
          Up to 6 images, shown as an auto-rotating slider at the top of the series page. The
          first image also becomes the series&apos; cover thumbnail.
        </p>
        <ImageUploader folder="series" value={images} fieldName="hero_images" max={6} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_order">Display order</Label>
        <Input
          id="display_order"
          name="display_order"
          type="number"
          defaultValue={series?.display_order ?? 0}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={series?.is_published ?? true}
          className="h-4 w-4 rounded border-input"
        />
        Published
      </label>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save series"}
      </Button>
    </form>
  );
}
