import { describe, expect, it } from "vitest";
import { looksLikeBot } from "@/lib/rate-limit";
import { inquiryLineCounts, inquiryReference } from "@/lib/notifications";
import { diffFields } from "@/lib/data/activity";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("looksLikeBot", () => {
  it("passes a normal, human-paced submission", () => {
    expect(looksLikeBot(form({ elapsed_ms: "5000" }))).toBe(false);
  });
  it("catches a filled honeypot, an instant submit, or a missing timer", () => {
    expect(looksLikeBot(form({ elapsed_ms: "5000", company: "Acme" }))).toBe(true);
    expect(looksLikeBot(form({ elapsed_ms: "100" }))).toBe(true);
    expect(looksLikeBot(form({}))).toBe(true);
  });
});

describe("inquiry lines", () => {
  it("counts structured basket items", () => {
    const counts = inquiryLineCounts({
      items: [
        { product_id: "a", variant_id: null, quantity: 2 },
        { product_id: "a", variant_id: "v", quantity: 1 },
        { product_id: "b", variant_id: null, quantity: 4 },
      ],
      product_ids: null,
    });
    expect(Object.fromEntries(counts)).toEqual({ a: 3, b: 4 });
  });

  it("falls back to the older repeated product_ids", () => {
    const counts = inquiryLineCounts({ items: null, product_ids: ["a", "a", "b"] });
    expect(Object.fromEntries(counts)).toEqual({ a: 2, b: 1 });
  });

  it("makes a short uppercase reference", () => {
    expect(inquiryReference("abcdef12-3456-7890")).toBe("#ABCDEF12");
  });
});

describe("diffFields", () => {
  it("reports only fields that changed", () => {
    expect(
      diffFields<{ name: string; price: number; sku: string | null }>({ name: "A", price: 10, sku: null }, { name: "A", price: 12, sku: "X" }, ["name", "price", "sku"])
    ).toEqual({ price: { from: 10, to: 12 }, sku: { from: null, to: "X" } });
  });
});
