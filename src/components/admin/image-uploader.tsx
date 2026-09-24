"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GripVertical, RotateCw, X } from "lucide-react";
import { mediaUrl, MEDIA_BUCKET } from "@/lib/supabase/storage";
import { prepareImage } from "@/lib/compress-image";
import {
  createLimiter,
  IMAGE_TYPES,
  isAbortError,
  MAX_UPLOAD_BYTES,
  uniqueStoragePath,
  uploadWithProgress,
} from "@/lib/upload";
import { useReorder } from "@/lib/use-reorder";
import { usePasteFiles } from "@/lib/use-paste-files";
import { UploadProgressRing } from "@/components/admin/upload-progress";
import { cn } from "@/lib/utils";

/**
 * Uploads directly to Supabase Storage from the browser (the authenticated
 * admin session satisfies the bucket's RLS policy), then exposes the
 * resulting storage path(s) via a hidden form field so the surrounding
 * <form action={serverAction}> picks them up on submit.
 *
 * Each file gets its own tile in the order it was picked, showing a local
 * preview with live upload progress, so the final order matches what the
 * admin sees even though up to three files upload at once. Tiles can be
 * dragged (mouse, or the grip on touch screens) or moved with the arrow
 * keys to change the order, and images can be pasted in with Ctrl/Cmd+V.
 *
 * Alongside `fieldName`, a parallel `${fieldName}_blur` field carries each
 * new image's tiny blurred preview ("" for images that were already saved,
 * which the server keeps as they were).
 */
/** `previewUrl` is kept for files uploaded this session so the tile doesn't flash while the remote copy loads. */
type DoneItem = { key: string; status: "done"; path: string; previewUrl?: string; blurDataUrl?: string | null };
type PendingItem = {
  key: string;
  status: "preparing" | "uploading" | "error";
  file: File;
  previewUrl: string;
  progress: number;
  error?: string;
  controller: AbortController;
};
type Item = DoneItem | PendingItem;

const limit = createLimiter(3);

export function ImageUploader({
  folder,
  fieldName,
  value,
  max = 1,
  onUploadingChange,
}: {
  folder: string;
  fieldName: string;
  value: string[];
  max?: number;
  /** Lets a surrounding form hold its submit button until every upload has landed. */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    value.map((path) => ({ key: path, status: "done", path }))
  );
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const doneItems = items.filter((i): i is DoneItem => i.status === "done");
  const uploading = items.some((i) => i.status === "preparing" || i.status === "uploading");
  const canAdd = items.length < max;

  const reorder = useReorder({ items, setItems, onCommit: () => {} });
  usePasteFiles(rootRef, (files) => handleFiles(files), canAdd);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  // Hidden inputs don't fire input/change events, so tell the surrounding
  // form (FormSaveBar's "Unsaved changes" + leave warning) when the saved
  // image list changes — added, removed or reordered.
  const doneSignature = doneItems.map((i) => i.path).join("|");
  const initialSignature = useRef(doneSignature);
  useEffect(() => {
    if (doneSignature === initialSignature.current) return;
    rootRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [doneSignature]);

  // Abort anything still in flight and free the blob previews if the form unmounts mid-upload.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      for (const item of itemsRef.current) {
        if (item.status !== "done") item.controller.abort();
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    []
  );

  function patch(key: string, update: Partial<PendingItem>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key && i.status !== "done" ? ({ ...i, ...update } as Item) : i))
    );
  }

  async function upload(item: PendingItem) {
    const { key, controller } = item;
    try {
      await limit(async () => {
        if (controller.signal.aborted) return;
        patch(key, { status: "preparing", progress: 0, error: undefined });
        const { file, blurDataUrl } = await prepareImage(item.file);
        patch(key, { status: "uploading" });
        const path = uniqueStoragePath(folder, file);
        await uploadWithProgress({
          bucket: MEDIA_BUCKET,
          path,
          file,
          signal: controller.signal,
          onProgress: (progress) => patch(key, { progress }),
        });
        setItems((prev) =>
          prev.map((i) =>
            i.key === key ? { key, status: "done", path, previewUrl: item.previewUrl, blurDataUrl } : i
          )
        );
      });
    } catch (e) {
      if (isAbortError(e)) return;
      patch(key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const room = max - items.length;
    const accepted: PendingItem[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      if (!IMAGE_TYPES.has(file.type)) {
        setError(`${file.name}: unsupported file type (use JPEG, PNG, WebP, AVIF, or GIF).`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`${file.name}: file is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`);
        continue;
      }
      accepted.push({
        key: crypto.randomUUID(),
        status: "uploading",
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        controller: new AbortController(),
      });
    }
    if (files.length > room && room > 0) {
      setError(`Only ${max} image${max === 1 ? "" : "s"} allowed — the extra ones were skipped.`);
    }

    if (inputRef.current) inputRef.current.value = "";
    if (accepted.length === 0) return;

    setItems((prev) => [...prev, ...accepted]);
    accepted.forEach(upload);
  }

  function retry(key: string) {
    const item = items.find((i) => i.key === key);
    if (!item || item.status !== "error") return;
    const fresh: PendingItem = { ...item, status: "uploading", progress: 0, controller: new AbortController() };
    setItems((prev) => prev.map((i) => (i.key === key ? fresh : i)));
    upload(fresh);
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target?.status !== "done") target?.controller.abort();
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.key !== key);
    });
  }

  const sortable = max > 1 && items.length > 1;

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {doneItems.length > 0 ? (
        doneItems.map((item) => (
          <span key={item.key} hidden>
            <input type="hidden" name={fieldName} value={item.path} />
            <input type="hidden" name={`${fieldName}_blur`} value={item.blurDataUrl ?? ""} />
          </span>
        ))
      ) : (
        <input type="hidden" name={fieldName} value="" />
      )}
      {/* Blocks the surrounding form from submitting (Save button, Enter, or Ctrl+S) until every upload has landed. */}
      {uploading && (
        <input
          aria-hidden
          tabIndex={-1}
          required
          value=""
          onChange={() => {}}
          className="sr-only"
          ref={(el) => el?.setCustomValidity("Wait for the images to finish uploading.")}
        />
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-3" {...reorder.rootProps}>
          {items.map((item, index) => (
            <div
              key={item.key}
              {...(sortable ? reorder.tileProps(index) : {})}
              title={sortable ? "Drag or use the arrow keys to reorder" : undefined}
              className={cn(
                "group relative h-24 w-24 overflow-hidden rounded-lg border bg-muted/40 outline-none animate-fade-in focus-visible:ring-2 focus-visible:ring-ring",
                item.status === "error" ? "border-destructive/60" : "border-border/70",
                sortable && "can-hover:cursor-grab can-hover:active:cursor-grabbing",
                reorder.draggingIndex === index && "scale-105 opacity-60 shadow-lg"
              )}
            >
              {item.status === "done" && !item.previewUrl ? (
                <Image src={mediaUrl(item.path)} alt="" fill sizes="96px" className="pointer-events-none object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
                <img src={item.previewUrl} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
              )}

              {index === 0 && max > 1 && item.status === "done" && (
                <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white">
                  Cover
                </span>
              )}

              {(item.status === "preparing" || item.status === "uploading") && (
                <UploadProgressRing
                  value={item.status === "preparing" ? null : item.progress}
                  label="Optimising"
                />
              )}

              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() => retry(item.key)}
                  title={`${item.error ?? "Upload failed"} — click to retry`}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/15 text-[0.65rem] font-medium text-destructive backdrop-blur-[1px]"
                >
                  <RotateCw className="size-4" />
                  Retry
                </button>
              )}

              {sortable && (
                <span
                  {...reorder.handleProps(index)}
                  aria-hidden
                  className="absolute left-1 top-1 z-10 flex size-6 items-center justify-center rounded-full bg-black/60 text-white can-hover:hidden"
                >
                  <GripVertical className="size-3.5" />
                </span>
              )}

              <button
                type="button"
                onClick={() => removeItem(item.key)}
                aria-label={item.status === "done" ? "Remove image" : "Cancel upload"}
                className={cn(
                  "absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-black/70 text-white",
                  item.status === "done" && "can-hover:hidden can-hover:group-hover:flex can-hover:group-focus-visible:flex"
                )}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex h-24 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed px-3 text-center text-xs transition-colors",
            dragActive
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
          )}
        >
          <span>{dragActive ? "Drop to upload" : uploading ? "Add more images" : "Drop image or click to upload"}</span>
          {!dragActive && <span className="text-[0.65rem] text-muted-foreground/80 can-hover:inline hidden">or paste with Ctrl/⌘+V</span>}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={max > 1}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
