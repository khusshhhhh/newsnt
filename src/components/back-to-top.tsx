"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small "back to top" button that appears once the visitor is well down a
 * long listing. Sits above the product page's sticky mobile quote bar when
 * that's showing (ProductDetail flags it on <html>).
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * 1.5);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // Send keyboard focus back up too, so the next Tab doesn't jump back down the page.
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed right-4 bottom-4 z-30 flex size-11 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur transition-[opacity,translate,bottom] duration-200 hover:bg-muted sm:right-6 sm:bottom-6",
        "max-lg:[html[data-sticky-bar]_&]:bottom-20",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
