const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO timestamp `days` ago — for server-rendered admin pages' date-window queries. */
export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export function isPast(iso: string | null | undefined) {
  return iso != null && new Date(iso).getTime() < Date.now();
}

/** Whole days since `iso`. */
export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}
