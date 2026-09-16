import Image from "next/image";
import Link from "next/link";
import type { ProductWithRelations } from "@/lib/supabase/types";
import { productImageUrl } from "@/lib/supabase/storage";
import { productHref } from "@/lib/department";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const image = product.product_images?.[0];
  const variants = product.variants ?? [];

  return (
    <Link
      href={productHref(product)}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {image ? (
          <Image
            src={productImageUrl(image.storage_path)}
            alt={image.alt_text ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.series && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.series.name}
          </span>
        )}
        <h3 className="font-heading text-base text-foreground">{product.name}</h3>
        {variants.length > 1 && (
          <div className="mt-auto flex items-center gap-1 pt-2">
            {variants.slice(0, 4).map((v) => (
              <span
                key={v.id}
                title={v.color_name}
                className="size-3 rounded-full border border-border"
                style={{ backgroundColor: v.color_hex ?? "transparent" }}
              />
            ))}
            {variants.length > 4 && (
              <span className="text-xs text-muted-foreground">+{variants.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
