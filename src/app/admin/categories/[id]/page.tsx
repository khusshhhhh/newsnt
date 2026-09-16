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
    .select("*, category_images(storage_path, display_order)")
    .eq("id", id)
    .single();

  if (!category) notFound();

  const images = [...(category.category_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((image) => image.storage_path);

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit category</h1>
      <div className="mt-8">
        <CategoryForm category={category} images={images} />
      </div>
    </div>
  );
}
