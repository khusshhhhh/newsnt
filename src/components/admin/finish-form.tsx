"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertFinish } from "@/lib/actions/admin/finishes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Finish } from "@/lib/supabase/types";

export function FinishForm({ finish }: { finish?: Finish }) {
  const router = useRouter();
  const isNew = !finish;
  const [state, formAction, pending] = useActionState(upsertFinish, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success(isNew ? "Finish created" : "Finish saved");
      router.push("/admin/finishes");
    }
  }, [state, isNew, router]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {finish && <input type="hidden" name="id" value={finish.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={finish?.name} placeholder="Matte Black" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">SKU code</Label>
        <Input
          id="code"
          name="code"
          defaultValue={finish?.code}
          placeholder="MB"
          maxLength={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Appended to a product&apos;s SKU prefix for this color, e.g. AKRLTS001 + MB → AKRLTS001MB.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hex">Swatch color</Label>
        <div className="flex items-center gap-3">
          <Input id="hex" name="hex" defaultValue={finish?.hex ?? "#1C1C1C"} required className="max-w-32" />
          <input
            type="color"
            aria-label="Pick swatch color"
            defaultValue={finish?.hex ?? "#1C1C1C"}
            onChange={(e) => {
              const input = document.getElementById("hex") as HTMLInputElement | null;
              if (input) input.value = e.target.value;
            }}
            className="size-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_order">Display order</Label>
        <Input id="display_order" name="display_order" type="number" defaultValue={finish?.display_order ?? 0} />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={finish?.is_active ?? true}
          className="size-4 rounded border-input"
        />
        Active (visible to shoppers and selectable on products)
      </label>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? (isNew ? "Creating…" : "Saving…") : isNew ? "Create finish" : "Save finish"}
      </Button>
    </form>
  );
}
