import { createClient } from "@/lib/supabase/client";

/** Matches the storage buckets' own file_size_limit, so a rejection here would be rejected by Storage too. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/**
 * Uploaded paths are unique (a UUID prefix), so the object behind a path
 * never changes — safe for Storage's CDN and the image optimizer to cache
 * for a year instead of supabase-js's default one hour.
 */
const IMMUTABLE_CACHE_SECONDS = "31536000";

/** Strips anything but alphanumerics/dot/dash/underscore so the storage path stays predictable. */
export function sanitizeFilename(name: string) {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return trimmed.slice(-100) || "upload";
}

/** `folder/<uuid>-<sanitized name>` — the shape every uploader in the app uses. */
export function uniqueStoragePath(folder: string, file: File) {
  return `${folder}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Same request supabase-js's `storage.upload()` makes, but over
 * XMLHttpRequest — fetch() still can't report upload progress — so the UI
 * can show a real percentage instead of an indefinite spinner. Uses the
 * signed-in session's token when there is one (admin uploads) and the anon
 * key otherwise (public project-photo submissions), exactly as supabase-js does.
 */
export async function uploadWithProgress({
  bucket,
  path,
  file,
  onProgress,
  signal,
}: {
  bucket: string;
  path: string;
  file: Blob;
  /** Fraction uploaded, 0–1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const {
    data: { session },
  } = await createClient().auth.getSession();

  const body = new FormData();
  body.append("cacheControl", IMMUTABLE_CACHE_SECONDS);
  body.append("", file);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Upload cancelled", "AbortError"));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${supabaseUrl}/storage/v1/object/${bucket}/${path.replace(/^\/+/, "")}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token ?? anonKey}`);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed.message || parsed.error || message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(body);
  });
}

export function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
}

/**
 * Runs at most `concurrency` tasks at once. A handful of parallel uploads
 * finishes a batch much sooner than one-at-a-time, without splitting the
 * connection so many ways that every tile crawls.
 */
export function createLimiter(concurrency: number) {
  let active = 0;
  const waiting: (() => void)[] = [];

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}
