import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteFinish } from "@/lib/actions/admin/finishes";

export default async function AdminFinishesPage() {
  const supabase = await createClient();
  const { data: finishes } = await supabase
    .from("finishes")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Finishes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The color/finish lineup shoppers pick from on every product. Inactive finishes stay on
            existing products but drop out of the picker for new ones.
          </p>
        </div>
        <Link href="/admin/finishes/new" className={buttonVariants()} data-admin-new>
          New finish
        </Link>
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {finishes?.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-5 rounded-full border border-border"
                style={{ backgroundColor: f.hex }}
              />
              <span className="text-foreground">{f.name}</span>
              <span className="text-xs text-muted-foreground">{f.code}</span>
              {!f.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/finishes/${f.id}`}
                data-admin-row
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit
              </Link>
              <DeleteButton action={deleteFinish.bind(null, f.id)} label="Delete finish" itemName={f.name} />
            </div>
          </div>
        ))}

        {(!finishes || finishes.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No finishes yet.</p>
        )}
      </div>
    </div>
  );
}
