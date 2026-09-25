"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";
import { mediaUrl, MEDIA_BUCKET } from "@/lib/supabase/storage";
import { prepareImage } from "@/lib/compress-image";
import { createLimiter, IMAGE_TYPES, MAX_UPLOAD_BYTES, uniqueStoragePath, uploadWithProgress } from "@/lib/upload";
import { useReorder } from "@/lib/use-reorder";
import { usePasteFiles } from "@/lib/use-paste-files";
import { UploadProgressRing } from "@/components/admin/upload-progress";
import { addProductImage, deleteProductImage, reorderProductImages } from "@/lib/actions/admin/images";
import type { ProductImage } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
  status: "preparing" | "uploading" | "saving" | "error";
  progress: number;
  error?: string;
};

const limit = createLimiter(3);

export function ProductImageManager({
  productId,
  variantId = null,
  images: initialImages,
  compact = false,
}: {
  productId: string;
  variantId?: string | null;
  images: ProductImage[];
  compact?: boolean;
}) {
  const [images, setImages] = useState(initialImages);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Mouse drags from anywhere on a photo, touch from its grip, keyboard with the arrow keys.
  const reorder = useReorder({
    items: images,
    setItems: setImages,
    onCommit: (next) =>
      startTransition(async () => {
        try {
          await reorderProductImages(productId, next.map((i) => i.id));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to save photo order");
        }
      }),
  });
  usePasteFiles(rootRef, (files) => handleFiles(files));

  function patchPending(id: string, update: Partial<PendingFile>) {
    setPendingFiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...update } : p)));
  }

  function failPending(item: PendingFile, message: string) {
    patchPending(item.id, { status: "error", error: message });
    toast.error(`${item.file.name}: ${message}`);
  }

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;

    const accepted: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!IMAGE_TYPES.has(file.type)) {
        toast.error(`${file.name}: unsupported file type (use JPEG, PNG, WebP, AVIF, or GIF).`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name}: file is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "preparing",
        progress: 0,
      });
    }

    if (inputRef.current) inputRef.current.value = "";
    if (accepted.length === 0) return;

    setPendingFiles((prev) => [...prev, ...accepted]);

    const prefix = variantId
      ? `products/${productId}/variants/${variantId}`
      : `products/${productId}`;

    // Up to three files optimise and upload at once (the slow part)…
    const uploads = accepted.map((item) =>
      limit(async () => {
        const file = await prepareImage(item.file);
        patchPending(item.id, { status: "uploading" });
        const path = uniqueStoragePath(prefix, file);
        await uploadWithProgress({
          bucket: MEDIA_BUCKET,
          path,
          file,
          onProgress: (progress) => patchPending(item.id, { progress }),
        });
        patchPending(item.id, { status: "saving" });
        return path;
      }).then(
        (path) => ({ ok: true as const, path }),
        (error: unknown) => ({ ok: false as const, error })
      )
    );
    // …but the rows are saved one by one in the order the files were picked,
    // so display_order matches what's on screen.
    let uploadedCount = 0;

    for (const [index, item] of accepted.entries()) {
      const result = await uploads[index];
      if (!result.ok) {
        failPending(item, result.error instanceof Error ? result.error.message : "Upload failed");
        continue;
      }

      try {
        const inserted = await addProductImage(productId, result.path, imagesRef.current.length, variantId);
        if (inserted) {
          imagesRef.current = [...imagesRef.current, inserted];
          setImages((prev) => [...prev, inserted]);
          uploadedCount += 1;
        }
        URL.revokeObjectURL(item.previewUrl);
        setPendingFiles((prev) => prev.filter((p) => p.id !== item.id));
      } catch (e) {
        failPending(item, e instanceof Error ? e.message : "Failed to save image");
      }
    }

    if (uploadedCount > 0) {
      toast.success(uploadedCount === 1 ? "Photo added" : `${uploadedCount} photos added`);
    }
  }

  function dismissPending(id: string) {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function remove(image: ProductImage) {
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    startTransition(async () => {
      try {
        await deleteProductImage(image.id, productId);
        toast.success("Photo removed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove photo");
      }
    });
  }

  const thumbSize = compact ? "h-20 w-20" : "h-28 w-28";
  const sortable = images.length > 1;

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {(images.length > 0 || pendingFiles.length > 0) && (
        <div className="flex flex-wrap gap-3" {...reorder.rootProps}>
          {images.map((image, index) => (
            <div
              key={image.id}
              {...(sortable ? reorder.tileProps(index) : {})}
              title={sortable ? "Drag or use the arrow keys to reorder" : undefined}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border/60 bg-card outline-none transition-[transform,opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-ring",
                sortable && "can-hover:cursor-grab can-hover:active:cursor-grabbing",
                thumbSize,
                reorder.draggingIndex === index && "scale-105 opacity-60 shadow-lg"
              )}
            >
              <Image
                src={mediaUrl(image.storage_path)}
                alt=""
                fill
                sizes="112px"
                draggable={false}
                className="pointer-events-none object-contain p-2"
              />
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
                onClick={() => remove(image)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white can-hover:hidden can-hover:group-hover:flex can-hover:group-focus-visible:flex"
              >
                ×
              </button>
            </div>
          ))}

          {pendingFiles.map((item) => (
            <div
              key={item.id}
              className={cn(
                "relative overflow-hidden rounded-lg border bg-card",
                thumbSize,
                item.status === "error" ? "border-destructive/60" : "border-border/60"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
              <img
                src={item.previewUrl}
                alt=""
                className="h-full w-full object-contain p-2"
              />
              {item.status !== "error" && (
                <UploadProgressRing
                  value={item.status === "uploading" ? item.progress : null}
                  label={item.status === "saving" ? "Saving" : "Optimising"}
                />
              )}
              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() => dismissPending(item.id)}
                  title={item.error ?? "Upload failed — click to dismiss"}
                  className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragEnter={(e) => {
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
          "flex items-center justify-center rounded-lg border border-dashed text-xs transition-colors",
          compact ? "h-20 w-full max-w-52" : "h-24 w-full max-w-xs",
          dragActive
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border text-muted-foreground"
        )}
      >
        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-2 text-center">
          <span>{dragActive ? "Drop to upload" : "Drop images or click to upload"}</span>
          {!dragActive && <span className="hidden text-[0.65rem] text-muted-foreground/80 can-hover:inline">or hover here and paste</span>}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
    </div>
  );
}
