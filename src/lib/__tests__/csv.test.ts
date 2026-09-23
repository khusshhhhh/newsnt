import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("CSV import/export", () => {
  it("round-trips quotes, commas and newlines", () => {
    const rows = [
      { name: 'Basin "Mini" Mixer', sku: "BM-1", description: "Line one\nLine two, with comma" },
      { name: "Plain", sku: "", description: "" },
    ];
    const headers = ["name", "sku", "description"];
    expect(parseCsv(toCsv(rows, headers))).toEqual(rows);
  });

  it("handles CRLF line endings and skips blank lines", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n3,4\r\n")).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
