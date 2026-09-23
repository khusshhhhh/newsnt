import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number; display?: string };

/**
 * Minimal single-series column chart in plain HTML — no chart library.
 * One hue (the foreground token, so it follows light/dark theme), thin bars
 * with 4px rounded tops anchored to the baseline and a gap between them, a
 * recessive baseline, labels in text tokens, a hover/focus tooltip per bar,
 * and a visually hidden table for screen readers.
 */
export function BarChart({
  data,
  title,
  height = 140,
  className,
}: {
  data: BarDatum[];
  title: string;
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // Only a handful of x labels, so they never collide.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure className={cn("w-full", className)}>
      <div className="flex items-end gap-0.5 border-b border-border" style={{ height }} aria-hidden="true">
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="group relative flex h-full flex-1 items-end" tabIndex={-1}>
            <div
              className="w-full rounded-t-[4px] bg-foreground/80 transition-colors group-hover:bg-foreground"
              style={{ height: `${d.value === 0 ? 0 : Math.max(2, (d.value / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm group-hover:block">
              <span className="text-muted-foreground">{d.label}</span> · {d.display ?? d.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 text-[10px] text-muted-foreground" aria-hidden="true">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}>
              <th scope="row">{d.label}</th>
              <td>{d.display ?? d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Buckets ISO timestamps into the last `weeks` calendar weeks (Monday start), oldest first. */
export function weeklyBuckets(timestamps: string[], weeks: number, now = new Date()): BarDatum[] {
  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const current = startOfWeek(now);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(current);
    start.setDate(start.getDate() - (weeks - 1 - i) * 7);
    return { start, count: 0 };
  });
  for (const ts of timestamps) {
    const week = startOfWeek(new Date(ts)).getTime();
    const bucket = buckets.find((b) => b.start.getTime() === week);
    if (bucket) bucket.count += 1;
  }
  return buckets.map((b) => ({
    label: b.start.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    value: b.count,
  }));
}
