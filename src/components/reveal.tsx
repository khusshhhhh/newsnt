import { cn } from "@/lib/utils";

/**
 * Fades + slides an element up as it scrolls into view. CSS-only (`.reveal`
 * in globals.css, on a scroll-driven timeline), so it needs no client JS and
 * never hides content that's already on screen while the page hydrates.
 * `delay` staggers siblings by starting their fade slightly further into
 * the scroll, which reads the same as a time delay for a row of cards.
 */
export function Reveal({
  delay = 0,
  y = 16,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & { delay?: number; y?: number }) {
  return (
    <div
      className={cn("reveal", className)}
      style={
        {
          "--reveal-y": `${y}px`,
          "--reveal-offset": `${Math.round(delay * 240)}px`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}
