#!/usr/bin/env node
/**
 * One-off maintenance for photos uploaded before the browser started
 * shrinking them (src/lib/compress-image.ts):
 *
 *   1. Re-encodes oversized originals (big PNG/JPEG exports, phone photos)
 *      to WebP at most 2560px on the long edge — keeping transparency — and
 *      points every row that used the old path at the new one.
 *   2. Backfills the tiny blurred previews (0035_image_blur_placeholders.sql)
 *      for rows that don't have one yet.
 *
 * Usage (reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env / .env.local):
 *
 *   node scripts/optimize-media.mjs                 # dry run: report only, changes nothing
 *   node scripts/optimize-media.mjs --apply         # upload new files + update rows
 *   node scripts/optimize-media.mjs --apply --delete-old
 *                                                   # …and remove the replaced originals
 *
 * The dry run works before 0035 is applied; --apply needs it. Replaced
 * originals are kept (and listed in scripts/.optimize-media-replaced.json)
 * unless --delete-old is passed, because cached catalog pages keep pointing
 * at them until the catalog revalidates (at most an hour, or immediately on
 * the next admin save) — deleting them straight away would briefly break
 * those pages. A later `--apply --delete-old` run removes the listed files
 * that nothing references any more. Re-running is safe: rows that are
 * already optimized and have a preview are skipped.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const DELETE_OLD = process.argv.includes("--delete-old");
const BUCKET = "media";
const MAX_EDGE = 2560;
const REENCODE_ABOVE_BYTES = 500 * 1024;
const CONCURRENCY = 4;
const REPLACED_LOG = "scripts/.optimize-media-replaced.json";
let blurColumnsExist = true;

for (const file of [".env", ".env.local"]) if (existsSync(file)) process.loadEnvFile(file);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Every column that stores a media path, with the column holding its preview. */
const REFERENCES = [
  { table: "product_images", pathColumn: "storage_path", blurColumn: "blur_data_url" },
  { table: "series_images", pathColumn: "storage_path", blurColumn: "blur_data_url" },
  { table: "category_images", pathColumn: "storage_path", blurColumn: "blur_data_url" },
  { table: "project_photos", pathColumn: "storage_path", blurColumn: "blur_data_url" },
  { table: "series", pathColumn: "hero_image_url", blurColumn: "hero_blur_data_url" },
];

const kb = (bytes) => `${Math.round(bytes / 1024).toLocaleString()} KB`;

async function loadRows() {
  const rows = [];
  for (const ref of REFERENCES) {
    const query = (columns) => supabase.from(ref.table).select(columns).not(ref.pathColumn, "is", null);
    let { data, error } = await query(`id, ${ref.pathColumn}, ${ref.blurColumn}`);
    if (error && /does not exist|could not find/i.test(error.message)) {
      // 0035 not applied yet — fine for a dry run, which only reports.
      blurColumnsExist = false;
      ({ data, error } = await query(`id, ${ref.pathColumn}`));
    }
    if (error) {
      console.error(`Reading ${ref.table} failed: ${error.message}`);
      process.exit(1);
    }
    for (const row of data) rows.push({ ...ref, id: row.id, path: row[ref.pathColumn], blur: row[ref.blurColumn] ?? null });
  }
  return rows;
}

async function blurDataUrl(input) {
  const buffer = await sharp(input).rotate().resize(16, 16, { fit: "inside" }).webp({ quality: 50 }).toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

/** Plans the work for one stored object: a smaller WebP (if worth it) and its preview. */
async function planObject(path) {
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !blob) return { path, error: error?.message ?? "download failed" };
  const original = Buffer.from(await blob.arrayBuffer());
  const meta = await sharp(original).metadata();
  const plan = { path, originalBytes: original.length, blur: await blurDataUrl(original) };

  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  const reencodable = !["gif", "avif", "svg"].includes(meta.format ?? "");
  if (reencodable && (original.length > REENCODE_ABOVE_BYTES || longEdge > MAX_EDGE)) {
    const webp = await sharp(original)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 5 })
      .toBuffer();
    if (webp.length < original.length * 0.9) {
      const dir = path.slice(0, path.lastIndexOf("/"));
      const name = path
        .slice(path.lastIndexOf("/") + 1)
        .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "")
        .replace(/\.[^.]+$/, "");
      plan.newPath = `${dir}/${randomUUID()}-${name || "image"}.webp`;
      plan.newBuffer = webp;
    }
  }
  return plan;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    })
  );
  return results;
}

const rows = await loadRows();
const paths = [...new Set(rows.map((r) => r.path))];
const pathsNeedingWork = paths.filter((p) => rows.some((r) => r.path === p && !r.blur) || !/\.webp$/i.test(p));
console.log(`${rows.length} image references, ${paths.length} files; checking ${pathsNeedingWork.length}…`);

const plans = await mapLimit(pathsNeedingWork, CONCURRENCY, async (path, i) => {
  const plan = await planObject(path);
  process.stdout.write(`\r  ${i + 1}/${pathsNeedingWork.length}`);
  return plan;
});
process.stdout.write("\n");

const failed = plans.filter((p) => p.error);
const reencode = plans.filter((p) => p.newPath);
const before = reencode.reduce((sum, p) => sum + p.originalBytes, 0);
const after = reencode.reduce((sum, p) => sum + p.newBuffer.length, 0);
const missingBlur = rows.filter((r) => !r.blur).length;

for (const p of reencode) console.log(`  ${p.path}\n    ${kb(p.originalBytes)} → ${kb(p.newBuffer.length)}`);
for (const p of failed) console.log(`  ! ${p.path}: ${p.error}`);
console.log(
  `\nRe-encode ${reencode.length} files: ${kb(before)} → ${kb(after)}` +
    (before ? ` (${Math.round((1 - after / before) * 100)}% smaller)` : "") +
    `\nBackfill ${missingBlur} blur previews` +
    (failed.length ? `\n${failed.length} files could not be read (left untouched)` : "")
);

if (!APPLY) {
  console.log("\nDry run — nothing changed. Re-run with --apply to write these changes.");
  if (!blurColumnsExist) console.log("(Apply supabase/migrations/0035_image_blur_placeholders.sql before --apply.)");
  process.exit(0);
}
if (!blurColumnsExist) {
  console.error("\nApply supabase/migrations/0035_image_blur_placeholders.sql before running with --apply.");
  process.exit(1);
}

const planByPath = new Map(plans.filter((p) => !p.error).map((p) => [p.path, p]));
const replaced = [];

for (const plan of reencode) {
  const { error } = await supabase.storage.from(BUCKET).upload(plan.newPath, plan.newBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error(`  ! upload ${plan.newPath}: ${error.message} — keeping the original`);
    delete plan.newPath;
  }
}

let updated = 0;
for (const row of rows) {
  const plan = planByPath.get(row.path);
  if (!plan) continue;
  const patch = {};
  if (plan.newPath) patch[row.pathColumn] = plan.newPath;
  if (!row.blur || plan.newPath) patch[row.blurColumn] = plan.blur;
  if (Object.keys(patch).length === 0) continue;
  const { error } = await supabase.from(row.table).update(patch).eq("id", row.id);
  if (error) console.error(`  ! ${row.table} ${row.id}: ${error.message}`);
  else updated += 1;
}

for (const plan of reencode) if (plan.newPath) replaced.push(plan.path);
console.log(`\nUpdated ${updated} rows.`);

// Originals replaced by this run plus any kept from earlier runs.
const previous = existsSync(REPLACED_LOG) ? JSON.parse(readFileSync(REPLACED_LOG, "utf8")) : [];
const candidates = [...new Set([...previous, ...replaced])];

if (DELETE_OLD && candidates.length > 0) {
  // Never delete anything a row still points at (re-read, in case of edits since).
  const referenced = new Set((await loadRows()).map((r) => r.path));
  const removable = candidates.filter((p) => !referenced.has(p));
  const { error } = removable.length ? await supabase.storage.from(BUCKET).remove(removable) : { error: null };
  if (error) {
    console.log(`Removing old files failed: ${error.message}`);
    writeFileSync(REPLACED_LOG, JSON.stringify(candidates, null, 2));
  } else {
    console.log(`Removed ${removable.length} replaced originals.`);
    rmSync(REPLACED_LOG, { force: true });
  }
} else if (candidates.length > 0) {
  writeFileSync(REPLACED_LOG, JSON.stringify(candidates, null, 2));
  console.log(
    `${candidates.length} replaced originals were kept (listed in ${REPLACED_LOG}). Once the catalog has` +
      ` refreshed (save anything in admin, or wait an hour), run with --apply --delete-old to remove them.`
  );
}
