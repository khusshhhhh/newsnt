-- Server-side guardrails on the media bucket: the admin uploader
-- (image-uploader.tsx) only checked file type/size in the browser, which is
-- trivially bypassed. These are enforced by Storage itself on every upload.

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
where id = 'media';
