import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg tracking-[0.06em]",
  md: "text-xl tracking-[0.06em]",
  lg: "text-2xl tracking-[0.08em] sm:text-3xl",
} as const;

/**
 * Wordmark, set in Flegrei (loaded via the Adobe Fonts kit link in
 * layout.tsx's <head>) via `.font-logo` in globals.css. Uses `currentColor`
 * so it drops into any surrounding color context — dark text on a light
 * header, white text over a hero photo, sidebar tones — without per-page
 * overrides.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return <span className={cn("font-logo", SIZES[size], className)}>FLOW</span>;
}
