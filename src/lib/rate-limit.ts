import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";

/** Best guess at the caller's IP — Vercel sets x-forwarded-for, with the client first. */
export async function clientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}

export const RATE_LIMITS = {
  inquiry: { max: 5, windowSeconds: 10 * 60 },
  review: { max: 3, windowSeconds: 30 * 60 },
  projectPhoto: { max: 3, windowSeconds: 30 * 60 },
  newsletter: { max: 5, windowSeconds: 60 * 60 },
  adminLogin: { max: 10, windowSeconds: 15 * 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/**
 * Per-IP cap for a named bucket, enforced server-side by the
 * `check_inquiry_rate_limit` Postgres function (0024) — despite its name it
 * works for any identifier, so each bucket just prefixes the IP.
 *
 * Returns true when the caller is within the limit. A failed check (e.g. a
 * transient DB error) fails open — we'd rather risk a little spam than block
 * a real customer.
 */
export async function withinRateLimit(bucket: RateLimitBucket, identifier?: string): Promise<boolean> {
  const { max, windowSeconds } = RATE_LIMITS[bucket];
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("check_inquiry_rate_limit", {
    p_identifier: `${bucket}:${identifier ?? (await clientIp())}`,
    p_max_count: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error(`rate limit check failed (${bucket}):`, error);
    return true;
  }
  return data !== false;
}

// Anti-spam for public forms: a hidden "company" field real visitors never
// see or fill (<HoneypotField />), and a minimum time between the form
// opening and submitting. Both catch scripted submissions without a CAPTCHA.
export const HONEYPOT_FIELD = "company";
const MIN_SUBMIT_MS = 1200;

/** True when the submission looks automated. Callers should report success without saving, so bots get no signal to adapt to. */
export function looksLikeBot(formData: FormData): boolean {
  const honeypot = formData.get(HONEYPOT_FIELD);
  const elapsedMs = Number(formData.get("elapsed_ms"));
  return (
    (typeof honeypot === "string" && honeypot.trim().length > 0) ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < MIN_SUBMIT_MS
  );
}
