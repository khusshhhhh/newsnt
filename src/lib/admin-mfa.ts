import { createHmac, randomInt, timingSafeEqual } from "crypto";

/**
 * Second factor for /admin sign-in: after password auth, an emailed 6-digit
 * code must be verified before the `admin_aal2` cookie (checked in
 * middleware) is set. Everything here is HMAC'd with a server-only secret —
 * `ADMIN_MFA_SECRET` if set, else the existing `SUPABASE_SERVICE_ROLE_KEY` —
 * rather than stored in a session table, so it works without new infra.
 */

export const AAL2_COOKIE_NAME = "admin_aal2";
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const AAL2_TTL_SECONDS = 60 * 60 * 12;

const OTP_TTL_MS = 10 * 60 * 1000;
const COOKIE_TTL_SECONDS = AAL2_TTL_SECONDS;

/** Missing on purpose in most local/dev setups — callers should surface this as a clear, fail-closed error rather than skipping the gate. */
export function mfaSecret(): string | null {
  return process.env.ADMIN_MFA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function otpExpiresAt(): string {
  return new Date(Date.now() + OTP_TTL_MS).toISOString();
}

/** When the current code was sent, derived from its expiry — so the resend cooldown needs no extra column. */
export function otpSentAt(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return new Date(expiresAt).getTime() - OTP_TTL_MS;
}

export function isOtpExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

function hmac(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function hashOtpCode(userId: string, code: string): string {
  const secret = mfaSecret();
  if (!secret) throw new Error("ADMIN_MFA_SECRET isn't configured — can't secure admin sign-in.");
  return hmac(secret, `${userId}:${code}`);
}

export function verifyOtpCode(userId: string, code: string, storedHash: string): boolean {
  return timingSafeEqualHex(hashOtpCode(userId, code), storedHash);
}

/** `userId.expiresAtMs.signature` — verified in both server actions and middleware (Proxy runs on the Node.js runtime here, so `crypto` is available in both). */
export function signAal2Cookie(userId: string): { name: string; value: string; maxAge: number } {
  const secret = mfaSecret();
  if (!secret) throw new Error("ADMIN_MFA_SECRET isn't configured — can't secure admin sign-in.");
  const expires = Date.now() + COOKIE_TTL_SECONDS * 1000;
  const payload = `${userId}.${expires}`;
  return { name: AAL2_COOKIE_NAME, value: `${payload}.${hmac(secret, payload)}`, maxAge: COOKIE_TTL_SECONDS };
}

export function verifyAal2Cookie(cookieValue: string | undefined | null, userId: string): boolean {
  if (!cookieValue) return false;
  const secret = mfaSecret();
  if (!secret) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;
  const [uid, expiresStr, sig] = parts;
  if (uid !== userId) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  return timingSafeEqualHex(hmac(secret, `${uid}.${expiresStr}`), sig);
}
