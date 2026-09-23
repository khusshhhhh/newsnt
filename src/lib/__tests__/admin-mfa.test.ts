import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("ADMIN_MFA_SECRET", "test-secret");
});

const mfa = await import("@/lib/admin-mfa");

describe("admin second factor", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 50; i++) expect(mfa.generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it("verifies only the right code for the right user", () => {
    const hash = mfa.hashOtpCode("user-1", "123456");
    expect(mfa.verifyOtpCode("user-1", "123456", hash)).toBe(true);
    expect(mfa.verifyOtpCode("user-1", "123457", hash)).toBe(false);
    expect(mfa.verifyOtpCode("user-2", "123456", hash)).toBe(false);
  });

  it("accepts a signed cookie for its own user only", () => {
    const cookie = mfa.signAal2Cookie("user-1");
    expect(mfa.verifyAal2Cookie(cookie.value, "user-1")).toBe(true);
    expect(mfa.verifyAal2Cookie(cookie.value, "user-2")).toBe(false);
  });

  it("rejects a tampered or expired cookie", () => {
    const cookie = mfa.signAal2Cookie("user-1");
    const [uid, , sig] = cookie.value.split(".");
    expect(mfa.verifyAal2Cookie(`${uid}.${Date.now() + 10 ** 9}.${sig}`, "user-1")).toBe(false);
    expect(mfa.verifyAal2Cookie(`${uid}.${Date.now() - 1000}.${sig}`, "user-1")).toBe(false);
    expect(mfa.verifyAal2Cookie("garbage", "user-1")).toBe(false);
    expect(mfa.verifyAal2Cookie(undefined, "user-1")).toBe(false);
  });

  it("derives when a code was sent from its expiry", () => {
    const expires = mfa.otpExpiresAt();
    const sentAt = mfa.otpSentAt(expires)!;
    expect(Math.abs(Date.now() - sentAt)).toBeLessThan(1000);
    expect(mfa.otpSentAt(null)).toBeNull();
    expect(mfa.isOtpExpired(null)).toBe(true);
    expect(mfa.isOtpExpired(expires)).toBe(false);
  });
});
