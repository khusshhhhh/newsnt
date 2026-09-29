import { describe, expect, it } from "vitest";
import { countProductsByFinish, listingHref } from "@/lib/listing";

describe("countProductsByFinish", () => {
  it("counts each product once per finish, matching names case-insensitively", () => {
    expect(
      countProductsByFinish([
        { variants: [{ color_name: "Matte Black" }, { color_name: "Brushed Gold" }] },
        { variants: [{ color_name: "matte black " }, { color_name: "Matte Black" }] },
        { variants: [] },
        { variants: null },
      ])
    ).toEqual({ "matte black": 2, "brushed gold": 1 });
  });
});

describe("listingHref", () => {
  it("keeps only non-default params", () => {
    expect(listingHref("/x", { finish: "MB", sort: "featured", inStockOnly: false, page: 1 })).toBe("/x?finish=MB");
    expect(listingHref("/x", { sort: "name", inStockOnly: true, page: 2 })).toBe("/x?sort=name&stock=in&page=2");
  });
});
