"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import { getImageProps } from "next/image";
import { toast } from "sonner";
import { Download, FileText, Mail, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, productPriceLabel } from "@/lib/format";
import { documentUrl, productImageUrl } from "@/lib/supabase/storage";
import { getDefaultVariant } from "@/lib/colors";
import { basketKey, openQuoteBasket, useQuoteBasket } from "@/lib/quote-basket";
import { departmentCopy } from "@/lib/department";
import { STOCK_STATUS_LABEL } from "@/lib/stock-status";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { ProductGallery } from "@/components/product-gallery";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { ReviewsSection } from "@/components/reviews-section";
import { Reveal } from "@/components/reveal";
import { ShareButton } from "@/components/share-button";
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
  initialFinishName,
  finishCodes = {},
}: {
  product: ProductWithRelations;
  reviews?: Review[];
  /** Pre-selects this colour — from the page's `?finish=` param, so a shared link opens on the same finish. */
  initialFinishName?: string;
  /** Colour name → finish code, for writing the selected finish back into the URL. */
  finishCodes?: Record<string, string>;
}) {
  const defaultVariant = useMemo(() => getDefaultVariant(product.variants), [product.variants]);
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      product.variants.find((v) => initialFinishName && v.color_name.toLowerCase() === initialFinishName.toLowerCase())
        ?.id ??
      defaultVariant?.id ??
      null
  );
  const selectedVariant = product.variants.find((v) => v.id === selectedId) ?? null;

  /**
   * Starts fetching a colour's main photo — at exactly the URL/size the
   * gallery will request — when its swatch is hovered, focused or touched,
   * so by the time it's clicked the cross-fade can usually start at once.
   */
  function warmVariant(variantId: string | null) {
    const variant = product.variants.find((v) => v.id === variantId);
    const image = variant?.product_images[0] ?? product.product_images[0];
    if (!image) return;
    const { props } = getImageProps({
      src: productImageUrl(image.storage_path),
      alt: "",
      fill: true,
      sizes: "(min-width: 1024px) 45vw, 100vw",
    });
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes });
  }

  function selectVariant(id: string | null) {
    setSelectedId(id);
    // Keep the URL in step (without a navigation) so the link can be shared.
    const variant = product.variants.find((v) => v.id === id);
    const code = variant ? finishCodes[variant.color_name] : undefined;
    const url = new URL(window.location.href);
    if (code) url.searchParams.set("finish", code);
    else url.searchParams.delete("finish");
    window.history.replaceState(window.history.state, "", url);
  }

  // Sticky mobile action bar: shown only once the main price/actions card
  // has scrolled out of view.
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsVisible, setActionsVisible] = useState(true);
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActionsVisible(entry.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lets fixed elements elsewhere (the back-to-top button) make room for the bar.
  useEffect(() => {
    const root = document.documentElement;
    if (actionsVisible) delete root.dataset.stickyBar;
    else root.dataset.stickyBar = "";
    return () => {
      delete root.dataset.stickyBar;
    };
  }, [actionsVisible]);

  // Remember this visit for the "Recently viewed" row.
  useEffect(() => {
    const image = defaultVariant?.product_images[0] ?? product.product_images[0];
    recordRecentlyViewed({
      productId: product.id,
      department: product.department,
      slug: product.slug,
      name: product.name,
      seriesName: product.series?.name ?? null,
      imagePath: image?.storage_path ?? product.variants.find((v) => v.product_images.length > 0)?.product_images[0]?.storage_path ?? null,
      priceLabel: productPriceLabel(product),
    });
  }, [product, defaultVariant]);

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
      unitPrice: selectedVariant?.price ?? product.price,
    });
    const view = { label: "View quote", onClick: openQuoteBasket };
    if (replaced) {
      toast.info(`Started a new quote request for ${departmentCopy(product.department).label}.`, { action: view });
    } else if (selectedVariant) {
      toast.success(`Added ${selectedVariant.color_name} to your quote request.`, { action: view });
    } else {
      toast.success("Added to your quote request.", { action: view });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <Reveal className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          setKey={selectedVariant?.id ?? "default"}
          images={images}
          productName={product.name}
        />
      </Reveal>

      <div>
        <Reveal delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {product.series && (
                <>
                  {product.series.name}
                  <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
                </>
              )}
              {product.category.name}
            </span>
            <ShareButton title={product.name} text={shareText(product.name, selectedVariant?.color_name)} />
          </div>
          <h1 className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-heading leading-[0.98] tracking-tight text-foreground">
            <span className="text-4xl font-medium sm:text-5xl">{product.name}</span>
            {selectedVariant && (
              <span key={selectedVariant.id} className="animate-fade-in text-xl font-normal text-muted-foreground sm:text-2xl">
                {selectedVariant.color_name}
              </span>
            )}
          </h1>
        </Reveal>

        <Reveal delay={0.18} className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div ref={actionsRef} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Price</span>
              <p
                key={selectedVariant?.price ?? product.price ?? "none"}
                className="mt-1 animate-fade-in font-heading text-2xl font-medium text-foreground"
              >
                {formatPrice(selectedVariant?.price ?? product.price)}
              </p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                  stockStatus === "in_stock" ? "bg-muted text-foreground" : "bg-foreground/10 text-foreground"
                )}
              >
                {STOCK_STATUS_LABEL[stockStatus]}
              </span>
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
          {resources.length > 0 && (
            <a
              href="#resources"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Download className="size-3.5" />
              Spec sheets &amp; downloads ({resources.length})
            </a>
          )}
        </Reveal>

        {product.variants.length > 0 && (
          <Reveal delay={0.22} className="mt-6">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Colour</span>
              <span key={selectedVariant?.id ?? "default"} className="animate-fade-in text-xs text-muted-foreground">
                {selectedVariant?.color_name ?? "Default"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.product_images.length > 0 && (
                <SwatchButton
                  label="Default"
                  active={selectedId === null}
                  onClick={() => selectVariant(null)}
                  onWarm={() => warmVariant(null)}
                  hex={null}
                />
              )}
              {product.variants.map((variant) => (
                <SwatchButton
                  key={variant.id}
                  label={variant.color_name}
                  active={selectedId === variant.id}
                  onClick={() => selectVariant(variant.id)}
                  onWarm={() => warmVariant(variant.id)}
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
          <Reveal delay={0.32} className="mt-10 scroll-mt-24 border-t border-border pt-8" id="resources">
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

      {/* Mobile: keep the key actions in reach once the main card scrolls away. */}
      <div
        aria-hidden={actionsVisible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur transition-transform duration-200 lg:hidden",
          actionsVisible ? "pointer-events-none translate-y-full" : "translate-y-0"
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatPrice(selectedVariant?.price ?? product.price)}
            {selectedVariant ? ` · ${selectedVariant.color_name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={addToQuote}
          tabIndex={actionsVisible ? -1 : 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" />
          {inBasket ? `In quote (${quantityInBasket})` : "Add to quote"}
        </button>
      </div>
    </div>
  );
}

function shareText(name: string, colour?: string) {
  return colour ? `${name} in ${colour} — Flow` : `${name} — Flow`;
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
  onWarm,
}: {
  label: string;
  hex: string | null;
  active: boolean;
  onClick: () => void;
  onWarm: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onWarm}
      onPointerDown={onWarm}
      onFocus={onWarm}
      title={label}
      aria-label={`Colour: ${label}`}
      aria-pressed={active}
      className="group/swatch relative -m-1.5 flex flex-col items-center gap-1 rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full border transition-[box-shadow,transform] duration-150 group-active/swatch:scale-[0.92]",
          active ? "ring-1 ring-foreground ring-offset-1 ring-offset-background" : "border-border"
        )}
        style={{ backgroundColor: hex ?? "transparent" }}
      >
        {!hex && (
          <span className="size-full rounded-full bg-[repeating-linear-gradient(45deg,var(--border),var(--border)_2px,transparent_2px,transparent_5px)]" />
        )}
      </span>
    </button>
  );
}
