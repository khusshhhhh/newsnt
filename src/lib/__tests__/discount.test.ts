import { describe, expect, it } from "vitest";
import { applyDiscount, discountFromRow, discountedTotal, formatPercent, normalizeDiscount } from "@/lib/discount";

describe("applyDiscount", () => {
  it("gives both the amount and the percentage for a percent discount", () => {
    expect(applyDiscount(1200, { type: "percent", value: 10 })).toMatchObject({ amount: 120, percent: 10, total: 1080 });
  });

  it("gives both the amount and the percentage for a fixed discount", () => {
    expect(applyDiscount(1200, { type: "amount", value: 150 })).toMatchObject({ amount: 150, percent: 12.5, total: 1050 });
  });

  it("never takes the total below zero", () => {
    expect(applyDiscount(100, { type: "amount", value: 500 })).toMatchObject({ amount: 100, total: 0 });
    expect(applyDiscount(100, { type: "percent", value: 150 })).toMatchObject({ amount: 100, percent: 100, total: 0 });
  });

  it("is a no-op without a discount or subtotal", () => {
    expect(applyDiscount(500, null)).toMatchObject({ amount: 0, total: 500 });
    expect(applyDiscount(0, { type: "percent", value: 10 })).toMatchObject({ amount: 0, total: 0 });
  });
});

describe("normalizeDiscount / discountFromRow", () => {
  it("drops zero and invalid values", () => {
    expect(normalizeDiscount({ type: "percent", value: 0 })).toBeNull();
    expect(normalizeDiscount({ type: "amount", value: Number.NaN })).toBeNull();
  });

  it("reads numeric columns that arrive as strings", () => {
    expect(discountFromRow({ discount_type: "amount", discount_value: "49.5" })).toEqual({ type: "amount", value: 49.5 });
    expect(discountFromRow({ discount_type: null, discount_value: null })).toBeNull();
  });
});

describe("discountedTotal", () => {
  it("ignores lines priced on enquiry", () => {
    const items = [
      { unitPrice: 100, quantity: 2 },
      { unitPrice: null, quantity: 5 },
    ];
    expect(discountedTotal(items, { type: "percent", value: 25 })).toBe(150);
  });
});

describe("formatPercent", () => {
  it("trims trailing zeros", () => {
    expect(formatPercent(10)).toBe("10%");
    expect(formatPercent(12.5)).toBe("12.5%");
    expect(formatPercent(12.345)).toBe("12.35%");
  });
});
