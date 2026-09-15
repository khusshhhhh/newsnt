"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl, MEDIA_BUCKET } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

/**
 * Uploads directly to Supabase Storage from the browser (the authenticated
 * admin session satisfies the bucket's RLS policy), then exposes the
 * resulting storage path(s) via a hidden form field so the surrounding
 * <form action={serverAction}> picks them up on submit.
 */
export function ImageUploader({
  folder,
  fieldName,
  value,
  max = 1,
}: {
  folder: string;
  fieldName: string;
  value: string[];
  max?: number;
}) {
  const [paths, setPaths] = useState<string[]>(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of Array.from(files).slice(0, max - paths.length)) {
      const path = `${folder}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      uploaded.push(path);
    }

    setPaths((prev) => [...prev, ...uploaded].slice(0, max));
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    setPaths((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {paths.length > 0 ? (
        paths.map((path) => (
          <input key={path} type="hidden" name={fieldName} value={path} />
        ))
      ) : (
        <input type="hidden" name={fieldName} value="" />
      )}

      {paths.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {paths.map((path, index) => (
            <div
              key={path}
              className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border/70"
            >
              <Image src={mediaUrl(path)} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {paths.length < max && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex h-24 w-full max-w-xs items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground",
            uploading && "opacity-60"
          )}
        >
          <label className="flex h-full w-full cursor-pointer items-center justify-center">
            {uploading ? "Uploading…" : "Drop image or click to upload"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple={max > 1}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
