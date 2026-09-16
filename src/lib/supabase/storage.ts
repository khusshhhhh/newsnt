import { createPublicClient } from "./public";

export const MEDIA_BUCKET = "media";

// `getPublicUrl` is a pure string builder (no network call), so a fresh
// client here is cheap and correctly URL-encodes paths with special
// characters, unlike the hand-concatenated string this used to build.
const bucket = createPublicClient().storage.from(MEDIA_BUCKET);

/** `storagePath` is the object path inside the `media` bucket. */
export function mediaUrl(storagePath: string) {
  return bucket.getPublicUrl(storagePath).data.publicUrl;
}

/** product_images.storage_path stores paths relative to the media bucket. */
export function productImageUrl(storagePath: string) {
  return mediaUrl(storagePath);
}
