export const MEDIA_BUCKET = "media";
export const DOCUMENTS_BUCKET = "documents";

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;

/**
 * Builds a public object URL exactly the way supabase-js's `getPublicUrl`
 * does (`encodeURI` over the whole URL, leading slashes trimmed), without
 * importing supabase-js. This module is used by client components on every
 * storefront page (the header's catalog nav, product cards, galleries), so
 * a plain string builder keeps the whole Supabase client out of the
 * public JavaScript bundle.
 */
function publicObjectUrl(bucket: string, storagePath: string) {
  return encodeURI(`${STORAGE_URL}/object/public/${bucket}/${storagePath.replace(/^\/+/, "")}`);
}

/** `storagePath` is the object path inside the `media` bucket. */
export function mediaUrl(storagePath: string) {
  return publicObjectUrl(MEDIA_BUCKET, storagePath);
}

/** product_images.storage_path stores paths relative to the media bucket. */
export function productImageUrl(storagePath: string) {
  return mediaUrl(storagePath);
}

/** product_resources.storage_path stores paths relative to the documents bucket. */
export function documentUrl(storagePath: string) {
  return publicObjectUrl(DOCUMENTS_BUCKET, storagePath);
}
