import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">New category</h1>
      <div className="mt-8">
        <CategoryForm />
      </div>
    </div>
  );
}
