"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitProjectPhoto } from "@/lib/actions/project-photos";
import { ImageUploader } from "@/components/admin/image-uploader";
import { HoneypotField } from "@/components/honeypot-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Department } from "@/lib/department";
import type { Series } from "@/lib/supabase/types";

export function ProjectPhotoSubmitDialog({
  department,
  series,
}: {
  department: Department;
  series: Series[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [photoUploading, setPhotoUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitProjectPhoto(null, formData);
      if (result.success) {
        toast.success("Thanks — your photo is in for approval.");
        formRef.current?.reset();
        setOpen(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        Submit your project
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Submit your project</DialogTitle>
          <DialogDescription>
            Share a photo of your finished installation — we&apos;ll review it before it appears here.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="department" value={department} />
          <HoneypotField />
          <div className="flex flex-col gap-1.5">
            <Label>Photo</Label>
            <ImageUploader
              folder="project-submissions"
              fieldName="storage_path"
              value={[]}
              max={1}
              onUploadingChange={setPhotoUploading}
            />
          </div>
          {series.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-series">Series (optional)</Label>
              <select
                id="project-series"
                name="series_id"
                className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none"
              >
                <option value="">Not sure / other</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-caption">Caption (optional)</Label>
            <Textarea id="project-caption" name="caption" rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" name="submitter_name" required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-email">Email</Label>
            <Input id="project-email" name="submitter_email" type="email" required autoComplete="email" />
          </div>
          <Button type="submit" disabled={pending || photoUploading} className="mt-1">
            {pending ? "Sending…" : photoUploading ? "Waiting for photo…" : "Submit photo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
