import { describe, expect, it } from "vitest";
import { createLimiter, sanitizeFilename } from "@/lib/upload";
import { documentUrl, mediaUrl } from "@/lib/supabase/storage";

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
