import { CategoryForm } from "@/components/admin/category-form";
import { isDepartment } from "@/lib/department";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department } = await searchParams;

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">New category</h1>
      <div className="mt-8">
        <CategoryForm
          defaultDepartment={department && isDepartment(department) ? department : undefined}
        />
      </div>
    </div>
  );
}
