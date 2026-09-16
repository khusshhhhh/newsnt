import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { isDepartment } from "@/lib/department";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department } = await searchParams;
  const supabase = await createClient();
  const [{ data: series }, { data: categories }] = await Promise.all([
    supabase.from("series").select("*").order("display_order", { ascending: true }),
    supabase.from("categories").select("*").order("display_order", { ascending: true }),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">New product</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Save the product first, then add photos on the next screen.
      </p>
      <div className="mt-8">
        <ProductForm
          series={series ?? []}
          categories={categories ?? []}
          defaultDepartment={department && isDepartment(department) ? department : undefined}
        />
      </div>
    </div>
  );
}
