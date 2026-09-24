import { cn } from "@/lib/utils";

/**
 * Upload progress for a thumbnail tile: a ring that fills as bytes go up,
 * with the percentage in the middle. `value` null means a step with no
 * measurable progress (optimising the photo before upload, or saving it
 * afterwards), shown as a spinning arc with `label` instead of a number.
 */
export function UploadProgressRing({
  value,
  label,
  className,
}: {
  value: number | null;
  label?: string;
  className?: string;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const percent = value == null ? null : Math.round(value * 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={percent == null ? label : `${percent}%`}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/55 backdrop-blur-[1px]",
        className
      )}
    >
      <div className="relative size-11">
        <svg
          viewBox="0 0 40 40"
          className={cn("size-11 -rotate-90", percent == null && "animate-spin [animation-duration:1.1s]")}
          aria-hidden
        >
          <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="3" className="stroke-foreground/15" />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-foreground transition-[stroke-dashoffset] duration-200 ease-out"
            strokeDasharray={circumference}
            strokeDashoffset={percent == null ? circumference * 0.72 : circumference * (1 - percent / 100)}
          />
        </svg>
        {percent != null && (
          <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-semibold tabular-nums text-foreground">
            {percent}%
          </span>
        )}
      </div>
      {percent == null && label && (
        <span className="text-[0.65rem] font-medium text-foreground/80">{label}</span>
      )}
    </div>
  );
}

/** A thin linear bar for list-style uploads (documents). `value` null = indeterminate. */
export function UploadProgressBar({ value, className }: { value: number | null; className?: string }) {
  const percent = value == null ? null : Math.round(value * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}
    >
      {percent == null ? (
        <div className="absolute inset-y-0 w-1/3 animate-indeterminate rounded-full bg-foreground/60" />
      ) : (
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
}
