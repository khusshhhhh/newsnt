"use client";

import { useActionState } from "react";
import { upsertSeries } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import type { Series } from "@/lib/supabase/types";

export function SeriesForm({ series }: { series?: Series }) {
  const [state, formAction, pending] = useActionState(upsertSeries, null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {series && <input type="hidden" name="id" value={series.id} />}

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
        <Label>Hero image</Label>
        <ImageUploader
          folder="series"
          value={series?.hero_image_url ? [series.hero_image_url] : []}
          fieldName="hero_image_url"
          max={1}
        />
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
