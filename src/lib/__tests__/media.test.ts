import { describe, expect, it } from "vitest";
import { BLUR_DATA_URL, blurFor, sanitizeBlurDataUrl } from "@/lib/blur-placeholder";
import { createLimiter, sanitizeFilename } from "@/lib/upload";
import { documentUrl, mediaUrl } from "@/lib/supabase/storage";

describe("sanitizeBlurDataUrl", () => {
  it("accepts a small base64 raster data URL", () => {
    const value = "data:image/webp;base64,UklGRkQAAABXRUJQVlA4IDgAAAA=";
    expect(sanitizeBlurDataUrl(value)).toBe(value);
  });

  it("rejects anything else a public form could send", () => {
    expect(sanitizeBlurDataUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBeNull();
    expect(sanitizeBlurDataUrl("https://example.com/x.png")).toBeNull();
    expect(sanitizeBlurDataUrl(`data:image/webp;base64,${"A".repeat(5000)}`)).toBeNull();
    expect(sanitizeBlurDataUrl(null)).toBeNull();
    expect(sanitizeBlurDataUrl("")).toBeNull();
  });
});

describe("blurFor", () => {
  it("prefers the stored preview, then the flat placeholder", () => {
    expect(blurFor("https://x/a.webp", "data:image/webp;base64,AA==")).toBe("data:image/webp;base64,AA==");
    expect(blurFor("https://x/a.webp", null)).toBe(BLUR_DATA_URL);
  });

  it("leaves static imports to their build-time preview", () => {
    expect(blurFor({ src: "/_next/static/a.webp", width: 1, height: 1 }, null)).toBeUndefined();
  });
});

describe("storage URLs", () => {
  it("matches supabase-js getPublicUrl (encodeURI, leading slashes trimmed)", () => {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;
    expect(mediaUrl("/series/a b.png")).toBe(`${base}/media/series/a%20b.png`);
    expect(documentUrl("products/x/spec.pdf")).toBe(`${base}/documents/products/x/spec.pdf`);
  });
});

describe("sanitizeFilename", () => {
  it("keeps storage paths predictable", () => {
    expect(sanitizeFilename(" My Photo (1).PNG ")).toBe("My-Photo--1-.PNG");
    expect(sanitizeFilename("   ")).toBe("upload");
  });
});

describe("createLimiter", () => {
  it("never runs more than the limit at once, and runs everything", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((r) => setTimeout(r, 5));
          active -= 1;
          return n * 2;
        })
      )
    );
    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });

  it("keeps going after a task fails", async () => {
    const limit = createLimiter(1);
    await expect(limit(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(limit(async () => "ok")).resolves.toBe("ok");
  });
});
