import { describe, expect, it } from "vitest";
import { TRASH_RETENTION_DAYS, daysUntilEligible, isEligibleForPermanentDelete } from "@/lib/trash";

const DAY = 24 * 60 * 60 * 1000;

describe("trash retention", () => {
  it("isn't eligible for permanent delete straight away", () => {
    const now = new Date().toISOString();
    expect(isEligibleForPermanentDelete(now)).toBe(false);
    expect(daysUntilEligible(now)).toBe(TRASH_RETENTION_DAYS);
  });

  it("becomes eligible after the retention window", () => {
    const old = new Date(Date.now() - (TRASH_RETENTION_DAYS + 1) * DAY).toISOString();
    expect(isEligibleForPermanentDelete(old)).toBe(true);
    expect(daysUntilEligible(old)).toBe(0);
  });
});
