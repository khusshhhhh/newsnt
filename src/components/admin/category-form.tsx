"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertCategory } from "@/lib/actions/admin/categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepartmentField } from "@/components/admin/department-field";
import { ImageUploader } from "@/components/admin/image-uploader";
import { FormSaveBar } from "@/components/admin/form-save-bar";
import { useSaveShortcut } from "@/lib/use-save-shortcut";
import type { Category } from "@/lib/supabase/types";
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

export function CategoryForm({
  category,
  images = [],
  defaultDepartment = "sanitary-tapware",
}: {
  category?: Category;
  images?: string[];
  defaultDepartment?: Department;
}) {
  const router = useRouter();
  const isNew = !category;
  const [state, formAction, pending] = useActionState(upsertCategory, null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success(isNew ? "Category created" : "Category saved");
      router.push("/admin/categories");
    }
  }, [state, isNew, router]);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-md flex-col gap-5">
      {category && <input type="hidden" name="id" value={category.id} />}

      <FormSection title="Basic details" description="The name and identifiers shown across the site.">
        <DepartmentField defaultValue={category?.department ?? defaultDepartment} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={category?.name} required autoFocus={isNew} />
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
      </FormSection>

      <FormSection title="Images" description="Up to 6 images, shown as an auto-rotating slider on the series page.">
        <ImageUploader folder="categories" value={images} fieldName="images" max={6} />
      </FormSection>

      <FormSection title="Visibility" description="Controls the order categories appear in.">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_order">Display order</Label>
          <Input
            id="display_order"
            name="display_order"
            type="number"
            defaultValue={category?.display_order ?? 0}
          />
        </div>
      </FormSection>

      <FormSaveBar
        pending={pending}
        pendingLabel={isNew ? "Creating…" : "Saving…"}
        label={isNew ? "Create category" : "Save category"}
        cancelHref="/admin/categories"
        error={state && "error" in state ? state.error : undefined}
      />
    </form>
  );
}
