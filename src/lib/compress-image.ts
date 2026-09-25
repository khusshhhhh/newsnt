/**
 * Prepares a photo in the browser before upload: downscales and re-encodes
 * it. Phone and camera shots routinely arrive at 4000px+ and 5–15 MB — far
 * more than any page ever displays — so shrinking them first makes the upload
 * itself several times faster and gives the image optimizer a lighter source
 * to resize on every cache miss. WebP keeps transparency (product cut-outs),
 * and anything that wouldn't come out smaller — already-small files, GIFs
 * (animation), AVIF (already efficient), or a browser that can't encode
 * WebP — is passed through untouched.
 */
const MAX_EDGE_PX = 2560;
const SKIP_BELOW_BYTES = 500 * 1024;
const WEBP_QUALITY = 0.86;

export async function prepareImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    return await compress(file, bitmap);
  } finally {
    bitmap.close();
  }
}

async function compress(file: File, bitmap: ImageBitmap): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/avif") return file;

  const longEdge = Math.max(bitmap.width, bitmap.height);
  if (file.size < SKIP_BELOW_BYTES && longEdge <= MAX_EDGE_PX) return file;

  try {
    const scale = Math.min(1, MAX_EDGE_PX / longEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    // Safari versions without a WebP encoder silently fall back to PNG — keep the original then.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
