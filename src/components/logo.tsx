import { cn } from "@/lib/utils";

const SIZES = {
  sm: { mark: "size-6 text-[10px]", text: "text-lg tracking-[0.06em]" },
  md: { mark: "size-7 text-xs", text: "text-xl tracking-[0.06em]" },
  lg: { mark: "size-9 text-sm", text: "text-2xl tracking-[0.08em] sm:text-3xl" },
} as const;

/**
 * Monogram + wordmark. Uses `currentColor` for both pieces (via `border-current`
 * and inherited text color) so it drops into any surrounding color context —
 * dark text on a light header, white text over a hero photo, sidebar tones —
 * without per-page overrides.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border-[1.5px] border-current font-heading font-black leading-none",
          s.mark
        )}
      >
        A
      </span>
      <span className={cn("font-heading font-black", s.text)}>AAKAR</span>
    </span>
  );
}
