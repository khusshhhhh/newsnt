import { createPublicClient } from "./public";

export const MEDIA_BUCKET = "media";
export const DOCUMENTS_BUCKET = "documents";

// `getPublicUrl` is a pure string builder (no network call), so a fresh
// client here is cheap and correctly URL-encodes paths with special
// characters, unlike the hand-concatenated string this used to build. Both
// buckets share one client instance rather than each creating their own.
const client = createPublicClient();
const bucket = client.storage.from(MEDIA_BUCKET);
const documentsBucket = client.storage.from(DOCUMENTS_BUCKET);

/** `storagePath` is the object path inside the `media` bucket. */
export function mediaUrl(storagePath: string) {
  return bucket.getPublicUrl(storagePath).data.publicUrl;
}

/** product_images.storage_path stores paths relative to the media bucket. */
export function productImageUrl(storagePath: string) {
  return mediaUrl(storagePath);
}

/** product_resources.storage_path stores paths relative to the documents bucket. */
export function documentUrl(storagePath: string) {
  return documentsBucket.getPublicUrl(storagePath).data.publicUrl;
}
