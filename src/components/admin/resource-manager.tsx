"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { documentUrl, DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import { formatBytes, isAbortError, MAX_UPLOAD_BYTES, uniqueStoragePath, uploadWithProgress } from "@/lib/upload";
import { UploadProgressBar } from "@/components/admin/upload-progress";
import { addProductResource, deleteProductResource } from "@/lib/actions/admin/resources";
import { Input } from "@/components/ui/input";
import type { ProductResource } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export function ResourceManager({
  productId,
  resources: initialResources,
}: {
  productId: string;
  resources: ProductResource[];
}) {
  const [resources, setResources] = useState(initialResources);
  const [name, setName] = useState("");
  /** Non-null while a file is uploading: its name/size and progress (null = saving the row). */
  const [upload, setUpload] = useState<{ name: string; size: number; progress: number | null } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const uploading = upload !== null;
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!name.trim()) {
      setError("Give this resource a name first (e.g. Spec Sheet).");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setError(`${file.name}: unsupported file type (use PDF, DOC, DOCX, JPEG, or PNG).`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`${file.name}: file is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`);
      return;
    }

    setUpload({ name: file.name, size: file.size, progress: 0 });
    setError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const path = uniqueStoragePath(`products/${productId}/resources`, file);
    try {
      await uploadWithProgress({
        bucket: DOCUMENTS_BUCKET,
        path,
        file,
        signal: controller.signal,
        onProgress: (progress) => setUpload((prev) => prev && { ...prev, progress }),
      });
    } catch (e) {
      if (!isAbortError(e)) {
        const message = e instanceof Error ? e.message : "Upload failed";
        setError(message);
        toast.error(message);
      }
      setUpload(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUpload((prev) => prev && { ...prev, progress: null });
    try {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("storage_path", path);
      formData.set("file_name", file.name);
      formData.set("display_order", String(resources.length));
      const created = await addProductResource(productId, formData);
      if (created) {
        setResources((prev) => [...prev, created]);
        toast.success(`${created.name} added`);
      }
      setName("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save resource";
      setError(message);
      toast.error(message);
    }

    setUpload(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(resource: ProductResource) {
    setResources((prev) => prev.filter((r) => r.id !== resource.id));
    startTransition(async () => {
      try {
        await deleteProductResource(resource.id, productId);
        toast.success(`${resource.name} removed`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove resource");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {resources.length > 0 && (
        <div className="flex flex-col gap-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="animate-fade-in flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{resource.name}</p>
                {resource.file_name && (
                  <p className="truncate text-xs text-muted-foreground">{resource.file_name}</p>
                )}
              </div>
              <a
                href={documentUrl(resource.storage_path)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Download ${resource.name}`}
              >
                <Download className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => remove(resource)}
                className="shrink-0 text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="resource_name" className="text-xs text-muted-foreground">
            Resource name
          </label>
          <Input
            id="resource_name"
            placeholder="Spec Sheet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
        </div>
        <label
          className={cn(
            "flex h-9 cursor-pointer items-center rounded-md border border-input px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
            uploading && "opacity-60"
          )}
        >
          {uploading ? "Uploading…" : "Choose file"}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {upload && (
        <div className="animate-fade-in flex flex-col gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5">
          <div className="flex items-center gap-3">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 truncate text-sm text-foreground">{upload.name}</p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {upload.progress == null
                ? "Saving…"
                : `${formatBytes(upload.size * upload.progress)} of ${formatBytes(upload.size)} · ${Math.round(upload.progress * 100)}%`}
            </span>
            {upload.progress != null && (
              <button
                type="button"
                onClick={() => controllerRef.current?.abort()}
                aria-label="Cancel upload"
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <UploadProgressBar value={upload.progress} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
