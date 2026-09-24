import type { StaticImageData } from "next/image";

/**
 * A tiny inline SVG used as next/image's blurDataURL when a photo has no
 * stored preview of its own, matching the site's monochrome skeleton color
 * instead of the browser's default blank/gray pop-in while it loads.
 */
const SHIMMER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e7e5e4"/></svg>`;

export const BLUR_DATA_URL = `data:image/svg+xml,${encodeURIComponent(SHIMMER_SVG)}`;

/** Longest a stored preview may be — matches the check constraints in 0035_image_blur_placeholders.sql. */
export const MAX_BLUR_DATA_URL_LENGTH = 4000;

/**
 * The blurDataURL for a photo: its own stored preview when it has one, the
 * flat placeholder otherwise. Static imports (`import x from "*.webp"`)
 * carry a build-time preview of their own, so they get `undefined` here to
 * let next/image use it.
 */
export function blurFor(src: string | StaticImageData, stored?: string | null) {
  if (typeof src !== "string") return undefined;
  return stored || BLUR_DATA_URL;
}

/**
 * True when a write failed only because the database predates
 * 0035_image_blur_placeholders.sql — callers retry without the preview
 * columns, so deploying this code before running the migration degrades to
 * flat placeholders instead of breaking uploads and saves.
 */
export function isMissingBlurColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && /blur_data_url/.test(error.message));
}

/** Drops the preview columns from a row (see `isMissingBlurColumn`). */
export function withoutBlur<T extends object>(row: T): T {
  const copy = { ...row } as Record<string, unknown>;
  delete copy.blur_data_url;
  delete copy.hero_blur_data_url;
  return copy as T;
}

/**
 * Accepts a client-supplied preview only if it's a small raster data: URL —
 * the public project-photo form writes this straight into a row, so it
 * mustn't carry anything else (or anything big).
 */
export function sanitizeBlurDataUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_BLUR_DATA_URL_LENGTH) return null;
  return /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : null;
}
