import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (!category) notFound();

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit category</h1>
      <div className="mt-8">
        <CategoryForm category={category} />
      </div>
    </div>
  );
}
