import { describe, expect, it } from "vitest";
import { escapeLikePattern, ilikeContainsPattern, sanitizeSearchTerm } from "@/lib/search";

const BACKSLASH = "\\";

describe("search input cleaning", () => {
  it("strips characters that would break a PostgREST .or() filter", () => {
    expect(sanitizeSearchTerm("mixer,sku.eq.1)")).toBe("mixer sku.eq.1");
    expect(sanitizeSearchTerm("  (basin)  ")).toBe("basin");
  });

  it("escapes ILIKE wildcards so they match literally", () => {
    const input = `100%_off${BACKSLASH}`;
    const expected = `100${BACKSLASH}%${BACKSLASH}_off${BACKSLASH}${BACKSLASH}`;
    expect(escapeLikePattern(input)).toBe(expected);
  });

  it("builds a contains pattern, or null for an empty query", () => {
    expect(ilikeContainsPattern("tap")).toBe("%tap%");
    expect(ilikeContainsPattern(" , ( ) ")).toBeNull();
    expect(ilikeContainsPattern(undefined)).toBeNull();
  });
});
