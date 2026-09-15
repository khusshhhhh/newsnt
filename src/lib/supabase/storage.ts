export const MEDIA_BUCKET = "media";

function publicStorageUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** `storagePath` is the object path inside the `media` bucket. */
export function mediaUrl(storagePath: string) {
  return publicStorageUrl(MEDIA_BUCKET, storagePath);
}

/** product_images.storage_path stores paths relative to the media bucket. */
export function productImageUrl(storagePath: string) {
  return mediaUrl(storagePath);
}
