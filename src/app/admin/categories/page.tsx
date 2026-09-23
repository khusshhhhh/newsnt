import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { DepartmentTabs } from "@/components/admin/department-tabs";
import { deleteCategory } from "@/lib/actions/admin/categories";
import { departmentCopy, isDepartment, type Department } from "@/lib/department";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department: rawDepartment } = await searchParams;
  const department: Department | undefined =
    rawDepartment && isDepartment(rawDepartment) ? rawDepartment : undefined;

  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("display_order", { ascending: true });
  if (department) query = query.eq("department", department);
  const { data: categories } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl text-foreground">Categories</h1>
        <Link
          href={
            department ? `/admin/categories/new?department=${department}` : "/admin/categories/new"
          }
          className={buttonVariants()}
          data-admin-new
        >
          New category
        </Link>
      </div>

      <div className="mt-4">
        <DepartmentTabs basePath="/admin/categories" active={department} />
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        {categories?.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-foreground">{c.name}</span>
              <span className="text-xs text-muted-foreground">/{c.slug}</span>
              <Badge variant="secondary">{departmentCopy(c.department).shortLabel}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/categories/${c.id}`}
                data-admin-row
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit
              </Link>
              <DeleteButton
                action={deleteCategory.bind(null, c.id)}
                label="Delete category"
                itemName={c.name}
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
