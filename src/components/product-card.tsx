import Image from "next/image";
import Link from "next/link";
import type { ProductWithRelations } from "@/lib/supabase/types";
import { productImageUrl } from "@/lib/supabase/storage";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const image = product.product_images?.[0];

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {image ? (
          <Image
            src={productImageUrl(image.storage_path)}
            alt={image.alt_text ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.series && (
          <span className="text-xs uppercase tracking-wide text-primary">
            {product.series.name}
          </span>
        )}
        <h3 className="font-heading text-base text-foreground">{product.name}</h3>
        <p className="mt-auto pt-2 text-sm text-muted-foreground">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
    </Link>
  );
}
