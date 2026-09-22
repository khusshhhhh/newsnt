"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Download, FileText, Mail, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { documentUrl } from "@/lib/supabase/storage";
import { getDefaultVariant } from "@/lib/colors";
import { basketKey, useQuoteBasket } from "@/lib/quote-basket";
import { departmentCopy } from "@/lib/department";
import { STOCK_STATUS_LABEL } from "@/lib/stock-status";
import { ProductGallery } from "@/components/product-gallery";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { ReviewsSection } from "@/components/reviews-section";
import { Reveal } from "@/components/reveal";
import type { ProductWithRelations, Review } from "@/lib/supabase/types";

/**
 * Owns the selected-color state and renders both columns of the product
 * page, since the title, gallery, and specs all need to react to the same
 * color switch — sharing one client component is simpler than lifting
 * state through context for what's otherwise a server-rendered page.
 */
export function ProductDetail({
  product,
  reviews = [],
}: {
  product: ProductWithRelations;
  reviews?: Review[];
}) {
  const defaultVariant = useMemo(() => getDefaultVariant(product.variants), [product.variants]);
  const [selectedId, setSelectedId] = useState<string | null>(defaultVariant?.id ?? null);
  const selectedVariant = product.variants.find((v) => v.id === selectedId) ?? null;

  const images = useMemo(() => {
    if (selectedVariant && selectedVariant.product_images.length > 0) {
      return selectedVariant.product_images;
    }
    return product.product_images;
  }, [selectedVariant, product.product_images]);

  const specs = Object.entries(product.specs ?? {});
  const sku = selectedVariant?.sku ?? product.sku;
  const hasSpecs = Boolean(sku) || specs.length > 0;
  const resources = product.resources ?? [];
  const quoteBasket = useQuoteBasket();
  // Keyed by product + the currently selected colour, so the same product
  // in a different colour is tracked (and quoted) as its own line.
  const currentKey = basketKey(product.id, selectedVariant?.id ?? null);
  const inBasket = quoteBasket.has(currentKey);
  const quantityInBasket = quoteBasket.quantityOf(currentKey);
  const stockStatus = selectedVariant?.stock_status ?? product.stock_status;

  const enquiryMessage = `Hi, I'd like to know more about ${product.name}${
    selectedVariant ? ` in ${selectedVariant.color_name}` : ""
  }${product.series ? ` (${product.series.name})` : ""}.`;

  function addToQuote() {
    const { replaced } = quoteBasket.addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      department: product.department,
      variantId: selectedVariant?.id ?? null,
      variantLabel: selectedVariant?.color_name ?? null,
    });
    if (replaced) {
      toast.info(`Started a new quote request for ${departmentCopy(product.department).label}.`);
    } else if (selectedVariant) {
      toast.success(`Added ${selectedVariant.color_name} to your quote request.`);
    } else {
      toast.success("Added to your quote request.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <Reveal className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          key={selectedVariant?.id ?? "default"}
          images={images}
          productName={product.name}
        />
      </Reveal>

      <div>
        <Reveal delay={0.1}>
          {product.series && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {product.series.name}
              <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
              {product.category.name}
            </span>
          )}
          <h1 className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-heading leading-[0.98] tracking-tight text-foreground">
            <span className="text-4xl font-medium sm:text-5xl">{product.name}</span>
            {selectedVariant && (
              <span className="text-xl font-normal text-muted-foreground sm:text-2xl">
                {selectedVariant.color_name}
              </span>
            )}
          </h1>
        </Reveal>

        <Reveal delay={0.18} className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Price</span>
              <p className="mt-1 font-heading text-2xl font-medium text-foreground">
                {formatPrice(selectedVariant?.price ?? product.price)}
              </p>
              {stockStatus !== "in_stock" && (
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {STOCK_STATUS_LABEL[stockStatus]}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {inBasket ? (
                <div className="flex items-center gap-1 rounded-full border border-border px-1.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => quoteBasket.setQuantity(currentKey, quantityInBasket - 1)}
                    aria-label="Decrease quantity in quote request"
                    className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-foreground">
                    {quantityInBasket}
                  </span>
                  <button
                    type="button"
                    onClick={addToQuote}
                    aria-label="Increase quantity in quote request"
                    className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addToQuote}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="size-4" />
                  Add to quote
                </button>
              )}
              <InquiryDialog
                department={product.department}
                productIds={[product.id]}
                variantIds={[selectedVariant?.id ?? null]}
                title={`Enquire about ${product.name}`}
                defaultMessage={enquiryMessage}
                triggerClassName="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mail className="size-4" />
                Enquire
              </InquiryDialog>
            </div>
          </div>
        </Reveal>

        {product.variants.length > 0 && (
          <Reveal delay={0.22} className="mt-6">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Colour</span>
              <span className="text-xs text-muted-foreground">
                {selectedVariant?.color_name ?? "Default"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.product_images.length > 0 && (
                <SwatchButton
                  label="Default"
                  active={selectedId === null}
                  onClick={() => setSelectedId(null)}
                  hex={null}
                />
              )}
              {product.variants.map((variant) => (
                <SwatchButton
                  key={variant.id}
                  label={variant.color_name}
                  active={selectedId === variant.id}
                  onClick={() => setSelectedId(variant.id)}
                  hex={variant.color_hex}
                />
              ))}
            </div>
          </Reveal>
        )}

        {hasSpecs && (
          <Reveal delay={0.26} className="mt-10 border-t border-border pt-8">
            <SectionHeading index={1} title="Specifications" />
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sku && <SpecTile label="SKU" value={sku} />}
              {specs.map(([key, value]) => (
                <SpecTile key={key} label={key} value={value} />
              ))}
            </dl>
          </Reveal>
        )}

        {resources.length > 0 && (
          <Reveal delay={0.32} className="mt-10 border-t border-border pt-8">
            <SectionHeading index={hasSpecs ? 2 : 1} title="Resources" />
            <div className="flex flex-col gap-2">
              {resources.map((resource) => (
                <a
                  key={resource.id}
                  href={documentUrl(resource.storage_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-foreground/30"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{resource.name}</span>
                  <Download className="size-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Reveal>
        )}

        <ReviewsSection productId={product.id} reviews={reviews} />
      </div>
    </div>
  );
}

function SectionHeading({ index, title }: { index: number; title: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <span className="font-heading text-sm font-black text-muted-foreground/40">
        {String(index).padStart(2, "0")}
      </span>
      <h2 className="font-heading text-lg font-medium text-foreground">{title}</h2>
    </div>
  );
}

function SpecTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function SwatchButton({
  label,
  hex,
  active,
  onClick,
}: {
  label: string;
  hex: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="relative flex flex-col items-center gap-1"
    >
      <motion.span
        whileTap={{ scale: 0.92 }}
        className={cn(
          "flex size-5 items-center justify-center rounded-full border transition-shadow",
          active ? "ring-1 ring-foreground ring-offset-1 ring-offset-background" : "border-border"
        )}
        style={{ backgroundColor: hex ?? "transparent" }}
      >
        {!hex && (
          <span className="size-full rounded-full bg-[repeating-linear-gradient(45deg,var(--border),var(--border)_2px,transparent_2px,transparent_5px)]" />
        )}
      </motion.span>
    </button>
  );
}
