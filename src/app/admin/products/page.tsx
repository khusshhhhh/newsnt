import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteProduct } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, series(name), category:categories(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">Products</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>
          New product
        </Link>
      </div>

      <div className="mt-8 divide-y divide-border/70 rounded-xl border border-border/70">
        {products?.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground">{p.name}</span>
                {!p.is_published && <Badge variant="secondary">Draft</Badge>}
                {p.is_featured && <Badge>Featured</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {p.category?.name}
                {p.series?.name ? ` · ${p.series.name}` : ""} ·{" "}
                {formatPrice(p.price, p.currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/products/${p.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit
              </Link>
              <DeleteButton
                action={deleteProduct.bind(null, p.id)}
                label="Delete product"
              />
            </div>
          </div>
        ))}

        {(!products || products.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No products yet.
          </p>
        )}
      </div>
    </div>
  );
}
