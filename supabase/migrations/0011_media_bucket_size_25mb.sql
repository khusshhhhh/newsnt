-- Raises the media bucket's server-side file size limit from 10 MB (see
-- 0009_media_bucket_limits.sql) to 25 MB, matching image-uploader.tsx.

update storage.buckets
set file_size_limit = 26214400 -- 25 MB
where id = 'media';
