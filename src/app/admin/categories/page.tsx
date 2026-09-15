import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCategory } from "@/app/admin/actions";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">Categories</h1>
        <Link href="/admin/categories/new" className={buttonVariants()}>
          New category
        </Link>
      </div>

      <div className="mt-8 divide-y divide-border/70 rounded-xl border border-border/70">
        {categories?.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-foreground">{c.name}</span>
              <span className="text-xs text-muted-foreground">/{c.slug}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/categories/${c.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit
              </Link>
              <DeleteButton
                action={deleteCategory.bind(null, c.id)}
                label="Delete category"
              />
            </div>
          </div>
        ))}

        {(!categories || categories.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No categories yet.
          </p>
        )}
      </div>
    </div>
  );
}
