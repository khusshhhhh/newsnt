"use client";

import { useActionState } from "react";
import { upsertCategory } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/supabase/types";

export function CategoryForm({ category }: { category?: Category }) {
  const [state, formAction, pending] = useActionState(upsertCategory, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {category && <input type="hidden" name="id" value={category.id} />}

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
