/**
 * A tiny inline SVG used as next/image's blurDataURL, matching the site's
 * monochrome skeleton color instead of the browser's default blank/gray
 * pop-in while a product photo loads.
 */
const SHIMMER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e7e5e4"/></svg>`;

export const BLUR_DATA_URL = `data:image/svg+xml,${encodeURIComponent(SHIMMER_SVG)}`;
