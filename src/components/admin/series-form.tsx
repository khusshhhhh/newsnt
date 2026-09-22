"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertSeries } from "@/lib/actions/admin/series";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/admin/image-uploader";
import { DepartmentField } from "@/components/admin/department-field";
import { FormSaveBar } from "@/components/admin/form-save-bar";
import { useSaveShortcut } from "@/lib/use-save-shortcut";
import type { Series } from "@/lib/supabase/types";
import type { Department } from "@/lib/department";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-5">
      <div>
        <h2 className="font-heading text-sm font-medium text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SeriesForm({
  series,
  images = [],
  defaultDepartment = "sanitary-tapware",
}: {
  series?: Series;
  images?: string[];
  defaultDepartment?: Department;
}) {
  const router = useRouter();
  const isNew = !series;
  const [state, formAction, pending] = useActionState(upsertSeries, null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef);
  const [story, setStory] = useState(series?.design_story ?? "");

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success(isNew ? "Series created" : "Series saved");
      router.push("/admin/series");
    }
  }, [state, isNew, router]);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-xl flex-col gap-5">
      {series && <input type="hidden" name="id" value={series.id} />}

      <FormSection title="Basic details" description="The name and identifiers shown across the site.">
        <DepartmentField defaultValue={series?.department ?? defaultDepartment} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={series?.name} required autoFocus={isNew} />
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
        </div>
      </FormSection>

      <FormSection title="Design story" description="Shown on the series page, under the hero images.">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="design_story">Story</Label>
            <span className="text-xs text-muted-foreground">{story.length} characters</span>
          </div>
          <Textarea
            id="design_story"
            name="design_story"
            rows={5}
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Hero images"
        description="Up to 6 images, shown as an auto-rotating slider at the top of the series page. The first image also becomes the series' cover thumbnail."
      >
        <ImageUploader folder="series" value={images} fieldName="hero_images" max={6} />
      </FormSection>

      <FormSection title="Visibility" description="Controls where and whether this series appears.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display_order">Display order</Label>
            <Input
              id="display_order"
              name="display_order"
              type="number"
              defaultValue={series?.display_order ?? 0}
            />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <Switch name="is_published" defaultChecked={series?.is_published ?? true} />
              Published
            </label>
          </div>
        </div>
      </FormSection>

      <FormSaveBar
        pending={pending}
        pendingLabel={isNew ? "Creating…" : "Saving…"}
        label={isNew ? "Create series" : "Save series"}
        cancelHref="/admin/series"
        error={state && "error" in state ? state.error : undefined}
      />
    </form>
  );
}
