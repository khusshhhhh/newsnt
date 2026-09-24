"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { productImageUrl } from "@/lib/supabase/storage";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ProductImage } from "@/lib/supabase/types";

/** Horizontal travel (px) that counts as a swipe rather than a tap. */
const SWIPE_PX = 50;

/**
 * Give this a `key` that changes whenever the image *set* changes (e.g. the
 * selected color) — remounting is how the active thumbnail resets, rather
 * than syncing it with an effect.
 *
 * On touch screens the main photo swipes left/right between images, and the
 * full-screen view pinches, double-taps and drags to zoom.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Images the visitor is about to look at: their full-size version starts
  // loading on thumbnail hover, or on touching the main photo (its
  // neighbours), so it's usually ready by the time it's shown.
  const [warmed, setWarmed] = useState<Set<number>>(() => new Set());
  const swipeRef = useRef<{ x: number; y: number; swiped: boolean } | null>(null);
  const active = images[activeIndex];
  const count = images.length;

  function warm(...indexes: number[]) {
    setWarmed((prev) => {
      const missing = indexes.filter((i) => !prev.has(i));
      return missing.length === 0 ? prev : new Set([...prev, ...missing]);
    });
  }

  function show(index: number, dir = 0) {
    setDirection(dir);
    setActiveIndex(((index % count) + count) % count);
  }

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border/60 bg-card text-sm text-muted-foreground">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => {
          // A swipe ends in a click too — don't open the lightbox for it.
          if (swipeRef.current?.swiped) return;
          setLightboxOpen(true);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" || count < 2) {
            swipeRef.current = null;
            return;
          }
          swipeRef.current = { x: e.clientX, y: e.clientY, swiped: false };
          warm((activeIndex + 1) % count, (activeIndex - 1 + count) % count);
        }}
        onPointerUp={(e) => {
          const start = swipeRef.current;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            start.swiped = true;
            show(activeIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
          }
        }}
        aria-label="Open full-size image"
        // pan-y: vertical drags still scroll the page; horizontal ones are ours to swipe with.
        style={{ touchAction: count > 1 ? "pan-y" : undefined }}
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-border/60 bg-card"
      >
        {[...warmed]
          .filter((index) => index !== activeIndex && images[index])
          .map((index) => (
            <Image
              key={`warm-${images[index].id}`}
              src={productImageUrl(images[index].storage_path)}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="pointer-events-none object-contain p-10 opacity-0"
            />
          ))}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={active.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={productImageUrl(active.storage_path)}
              alt={active.alt_text ?? productName}
              fill
              preload={activeIndex === 0}
              sizes="(min-width: 1024px) 45vw, 100vw"
              placeholder="blur"
              blurDataURL={active.blur_data_url || BLUR_DATA_URL}
              draggable={false}
              className="object-contain p-10"
            />
          </motion.div>
        </AnimatePresence>
        <span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-4" />
        </span>
        {count > 1 && (
          <span aria-hidden className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 can-hover:hidden">
            {images.map((image, i) => (
              <span
                key={image.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activeIndex ? "w-4 bg-foreground/70" : "w-1.5 bg-foreground/25"
                )}
              />
            ))}
          </span>
        )}
      </button>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => show(index, Math.sign(index - activeIndex))}
              onPointerEnter={() => warm(index)}
              onFocus={() => warm(index)}
              aria-label={`Show image ${index + 1} of ${count}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-card transition-colors",
                index === activeIndex
                  ? "border-foreground"
                  : "border-border/60 hover:border-muted-foreground"
              )}
            >
              <Image
                src={productImageUrl(image.storage_path)}
                alt={image.alt_text ?? productName}
                fill
                sizes="64px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        images={images}
        productName={productName}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        index={activeIndex}
        onIndexChange={(index, dir) => show(index, dir)}
      />
    </div>
  );
}

function Lightbox({
  images,
  productName,
  open,
  onOpenChange,
  index,
  onIndexChange,
}: {
  images: ProductImage[];
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  onIndexChange: (index: number, direction: number) => void;
}) {
  const active = images[index];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") onIndexChange(index + 1, 1);
      if (e.key === "ArrowLeft") onIndexChange(index - 1, -1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, images.length]);

  if (!active) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="fixed inset-0 top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-none bg-background/95 p-4 ring-0 backdrop-blur-sm sm:max-w-none sm:p-10"
      >
        <DialogTitle className="sr-only">{productName} — full-size image</DialogTitle>

        {/* Keyed by image so zoom resets whenever the photo changes. */}
        <ZoomableImage
          key={active.id}
          image={active}
          productName={productName}
          onSwipe={hasMultiple ? (dir) => onIndexChange(index + dir, dir) : undefined}
          onSwipeDown={() => onOpenChange(false)}
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange(index - 1, -1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent sm:left-4"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(index + 1, 1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent sm:right-4"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        <span className="pointer-events-none absolute bottom-4 flex flex-col items-center gap-1 text-sm text-muted-foreground">
          {hasMultiple && (
            <span>
              {index + 1} / {images.length}
            </span>
          )}
          <span className="text-xs text-muted-foreground/80">
            <span className="can-hover:hidden">Pinch or double-tap to zoom</span>
            <span className="hidden can-hover:inline">Scroll or double-click to zoom</span>
          </span>
        </span>
      </DialogContent>
    </Dialog>
  );
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

type Point = { x: number; y: number };

/**
 * Pinch (two fingers), double-tap/double-click, trackpad pinch or mouse
 * wheel to zoom, anchored under the fingers/cursor; drag to pan once
 * zoomed. At 1× a horizontal swipe changes image and a downward swipe
 * closes the viewer. Transforms are applied straight to the DOM node
 * during a gesture (no re-render per frame).
 */
function ZoomableImage({
  image,
  productName,
  onSwipe,
  onSwipeDown,
}: {
  image: ProductImage;
  productName: string;
  onSwipe?: (direction: number) => void;
  onSwipeDown: () => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    startView: { scale: number; x: number; y: number };
    pinch?: { distance: number; mid: Point };
  } | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  /** Pointer position relative to the surface's centre (the transform origin). */
  function local(p: Point): Point {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return { x: p.x - rect.left - rect.width / 2, y: p.y - rect.top - rect.height / 2 };
  }

  function apply(next: { scale: number; x: number; y: number }, animate = false) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const scale = Math.min(MAX_SCALE, Math.max(1, next.scale));
    // Keep the photo covering the frame: pan only as far as the zoom allows.
    const maxX = rect ? ((scale - 1) * rect.width) / 2 : 0;
    const maxY = rect ? ((scale - 1) * rect.height) / 2 : 0;
    const x = Math.min(maxX, Math.max(-maxX, next.x));
    const y = Math.min(maxY, Math.max(-maxY, next.y));
    view.current = { scale, x, y };
    const layer = layerRef.current;
    if (layer) {
      layer.style.transition = animate ? "transform 250ms ease-out" : "none";
      layer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
    setZoomed(scale > 1.01);
  }

  /** Zooms to `scale`, keeping the point under `anchor` (surface-local) fixed. */
  function zoomAt(anchor: Point, scale: number, animate = false) {
    const v = view.current;
    const target = Math.min(MAX_SCALE, Math.max(1, scale));
    const qx = (anchor.x - v.x) / v.scale;
    const qy = (anchor.y - v.y) / v.scale;
    apply({ scale: target, x: anchor.x - qx * target, y: anchor.y - qy * target }, animate);
  }

  function toggleZoom(p: Point) {
    const anchor = local(p);
    if (view.current.scale > 1.01) apply({ scale: 1, x: 0, y: 0 }, true);
    else zoomAt(anchor, DOUBLE_TAP_SCALE, true);
  }

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    // Wheel / trackpad pinch (ctrlKey) zoom; non-passive so the page itself doesn't zoom or scroll.
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
      zoomAt(local({ x: e.clientX, y: e.clientY }), view.current.scale * factor);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function beginGesture() {
    const pts = [...pointers.current.values()];
    const startView = { ...view.current };
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        start: a,
        startView,
        pinch: { distance: Math.hypot(a.x - b.x, a.y - b.y), mid: local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) },
      };
    } else if (pts.length === 1) {
      gesture.current = { start: pts[0], startView };
    } else {
      gesture.current = null;
    }
  }

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative h-full w-full max-w-4xl touch-none select-none overflow-hidden",
        zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        beginGesture();
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gesture.current;
        if (!g) return;
        const pts = [...pointers.current.values()];
        if (g.pinch && pts.length >= 2) {
          const [a, b] = pts;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          const mid = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          const scale = Math.min(MAX_SCALE, Math.max(1, (g.startView.scale * distance) / g.pinch.distance));
          // The image point that started under the fingers' midpoint stays under it (pinch + pan in one).
          const qx = (g.pinch.mid.x - g.startView.x) / g.startView.scale;
          const qy = (g.pinch.mid.y - g.startView.y) / g.startView.scale;
          apply({ scale, x: mid.x - qx * scale, y: mid.y - qy * scale });
        } else if (g.startView.scale > 1.01) {
          apply({
            scale: g.startView.scale,
            x: g.startView.x + (e.clientX - g.start.x),
            y: g.startView.y + (e.clientY - g.start.y),
          });
        }
      }}
      onPointerUp={(e) => {
        const g = gesture.current;
        const wasSingle = pointers.current.size === 1 && !g?.pinch;
        pointers.current.delete(e.pointerId);

        if (wasSingle && g && g.startView.scale <= 1.01) {
          const dx = e.clientX - g.start.x;
          const dy = e.clientY - g.start.y;
          if (onSwipe && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            onSwipe(dx < 0 ? 1 : -1);
            return;
          }
          if (e.pointerType !== "mouse" && dy > 120 && dy > Math.abs(dx) * 1.5) {
            onSwipeDown();
            return;
          }
        }

        // Double-tap / double-click: a second short tap near the first.
        if (wasSingle && g && Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y) < 10) {
          const now = performance.now();
          const prev = lastTap.current;
          if (prev && now - prev.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.point.x, e.clientY - prev.point.y) < 30) {
            lastTap.current = null;
            toggleZoom({ x: e.clientX, y: e.clientY });
          } else {
            lastTap.current = { time: now, point: { x: e.clientX, y: e.clientY } };
          }
        }
        // Lifting one finger of a pinch continues as a pan with the other.
        beginGesture();
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        beginGesture();
      }}
    >
      <div ref={layerRef} className="absolute inset-0 origin-center will-change-transform">
        <Image
          src={productImageUrl(image.storage_path)}
          alt={image.alt_text ?? productName}
          fill
          // Once zoomed, ask for a sharper source (the browser swaps it in when it arrives).
          sizes={zoomed ? "250vw" : "100vw"}
          placeholder="blur"
          blurDataURL={image.blur_data_url || BLUR_DATA_URL}
          draggable={false}
          className="pointer-events-none object-contain"
        />
      </div>
    </div>
  );
}
