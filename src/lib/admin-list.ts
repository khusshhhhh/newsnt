export const ADMIN_PAGE_SIZE = 25;

export function parsePage(raw: string | undefined) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** `.range()` bounds for a 1-based page. */
export function pageRange(page: number, size = ADMIN_PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

export function pageCount(total: number | null | undefined, size = ADMIN_PAGE_SIZE) {
  return Math.max(1, Math.ceil((total ?? 0) / size));
}

/** Builds `basePath?…` from the current filters plus overrides — undefined/empty values are dropped, so filters stay shareable in the URL. */
export function buildHref(
  basePath: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {}
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
