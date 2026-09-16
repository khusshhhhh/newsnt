"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl, MEDIA_BUCKET } from "@/lib/supabase/storage";
import { addProductImage, deleteProductImage } from "@/lib/actions/admin/images";
import type { ProductImage } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const prefix = variantId
      ? `products/${productId}/variants/${variantId}`
      : `products/${productId}`;

    let uploaded = 0;
    let lastError: string | null = null;

    for (const file of Array.from(files)) {
      const path = `${prefix}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        lastError = uploadError.message;
        continue;
      }

      try {
        const inserted = await addProductImage(productId, path, images.length, variantId);
        if (inserted) {
          setImages((prev) => [...prev, inserted]);
          uploaded += 1;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Failed to save image";
      }
    }

    if (uploaded > 0) toast.success(uploaded === 1 ? "Photo added" : `${uploaded} photos added`);
    if (lastError) {
      setError(lastError);
      toast.error(lastError);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
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
      {images.length > 0 && (
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
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground",
          compact ? "h-20 w-full max-w-52" : "h-24 w-full max-w-xs",
          uploading && "opacity-60"
        )}
      >
        <label className="flex h-full w-full cursor-pointer items-center justify-center px-2 text-center">
          {uploading ? "Uploading…" : "Drop images or click to upload"}
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

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
