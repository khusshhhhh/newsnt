"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { documentUrl, DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import { addProductResource, deleteProductResource } from "@/lib/actions/admin/resources";
import { Input } from "@/components/ui/input";
import type { ProductResource } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

/** Strips anything but alphanumerics/dot/dash/underscore so the storage path stays predictable. */
function sanitizeFilename(name: string) {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return trimmed.slice(-100) || "upload";
}

export function ResourceManager({
  productId,
  resources: initialResources,
}: {
  productId: string;
  resources: ProductResource[];
}) {
  const [resources, setResources] = useState(initialResources);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
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
    if (file.size > MAX_FILE_BYTES) {
      setError(`${file.name}: file is too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB).`);
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const path = `products/${productId}/resources/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("storage_path", path);
      formData.set("file_name", file.name);
      formData.set("display_order", String(resources.length));
      const created = await addProductResource(productId, formData);
      if (created) setResources((prev) => [...prev, created]);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save resource");
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(resource: ProductResource) {
    setResources((prev) => prev.filter((r) => r.id !== resource.id));
    startTransition(() => {
      deleteProductResource(resource.id, productId);
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

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
