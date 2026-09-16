"use client";

import { useActionState } from "react";
import { upsertCategory } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DepartmentField } from "@/components/admin/department-field";
import { ImageUploader } from "@/components/admin/image-uploader";
import type { Category } from "@/lib/supabase/types";
import type { Department } from "@/lib/department";

export function CategoryForm({
  category,
  images = [],
  defaultDepartment = "sanitary-tapware",
}: {
  category?: Category;
  images?: string[];
  defaultDepartment?: Department;
}) {
  const [state, formAction, pending] = useActionState(upsertCategory, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {category && <input type="hidden" name="id" value={category.id} />}

      <DepartmentField defaultValue={category?.department ?? defaultDepartment} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={category?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={category?.slug}
          placeholder="auto-generated from name if left blank"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Images</Label>
        <p className="text-xs text-muted-foreground">
          Up to 6 images, shown as an auto-rotating slider on the series page.
        </p>
        <ImageUploader folder="categories" value={images} fieldName="images" max={6} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_order">Display order</Label>
        <Input
          id="display_order"
          name="display_order"
          type="number"
          defaultValue={category?.display_order ?? 0}
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save category"}
      </Button>
    </form>
  );
}
