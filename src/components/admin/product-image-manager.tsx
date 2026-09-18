"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl, MEDIA_BUCKET } from "@/lib/supabase/storage";
import { addProductImage, deleteProductImage } from "@/lib/actions/admin/images";
import type { ProductImage } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// Matches the generic ImageUploader's limits and the `media` bucket's own
// file_size_limit/allowed_mime_types, so a rejection here would be rejected
// by the bucket policy too — this just surfaces it before the network round trip.
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/** Strips anything but alphanumerics/dot/dash/underscore so the storage path stays predictable. */
function sanitizeFilename(name: string) {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return trimmed.slice(-100) || "upload";
}

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
};

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

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const accepted: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.has(file.type)) {
        toast.error(`${file.name}: unsupported file type (use JPEG, PNG, WebP, AVIF, or GIF).`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name}: file is too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB).`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
      });
    }

    if (inputRef.current) inputRef.current.value = "";
    if (accepted.length === 0) return;

    setPendingFiles((prev) => [...prev, ...accepted]);

    const supabase = createClient();
    const prefix = variantId
      ? `products/${productId}/variants/${variantId}`
      : `products/${productId}`;

    let uploadedCount = 0;

    for (const item of accepted) {
      const path = `${prefix}/${crypto.randomUUID()}-${sanitizeFilename(item.file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, item.file, { upsert: false });

      if (uploadError) {
        setPendingFiles((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "error", error: uploadError.message } : p))
        );
        toast.error(`${item.file.name}: ${uploadError.message}`);
        continue;
      }

      try {
        const inserted = await addProductImage(productId, path, images.length, variantId);
        if (inserted) {
          setImages((prev) => [...prev, inserted]);
          uploadedCount += 1;
        }
        URL.revokeObjectURL(item.previewUrl);
        setPendingFiles((prev) => prev.filter((p) => p.id !== item.id));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to save image";
        setPendingFiles((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "error", error: message } : p))
        );
        toast.error(`${item.file.name}: ${message}`);
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

  return (
    <div className="flex flex-col gap-3">
      {(images.length > 0 || pendingFiles.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border/60 bg-card",
                thumbSize
              )}
            >
              <Image
                src={mediaUrl(image.storage_path)}
                alt=""
                fill
                className="object-contain p-2"
              />
              <button
                type="button"
                onClick={() => remove(image)}
                className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white group-hover:flex"
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
                className={cn(
                  "h-full w-full object-contain p-2",
                  item.status === "uploading" && "opacity-50"
                )}
              />
              {item.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                  <Loader2 className="size-5 animate-spin text-foreground" />
                </div>
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
        <label className="flex h-full w-full cursor-pointer items-center justify-center px-2 text-center">
          {dragActive ? "Drop to upload" : "Drop images or click to upload"}
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
