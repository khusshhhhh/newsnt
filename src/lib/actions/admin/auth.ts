"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { withinRateLimit } from "@/lib/rate-limit";
import { sendPasswordSetupEmail } from "@/lib/password-setup";
import {
  AAL2_COOKIE_NAME,
  AAL2_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  mfaSecret,
  otpExpiresAt,
  otpSentAt,
  signAal2Cookie,
  verifyOtpCode,
} from "@/lib/admin-mfa";
import { fail } from "./_shared";

/** Only same-site admin paths — never an absolute URL an attacker could put in `?redirectTo=`. */
function safeRedirect(target: string | null | undefined) {
  if (!target || !target.startsWith("/admin") || target.startsWith("//")) return "/admin";
  return target;
}

function serviceRoleConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(mfaSecret());
}

/**
 * OTP bookkeeping goes through the service role: 0030 removed the policy
 * that let a signed-in admin update their own `admins` row, because a
 * password-only session could use it to reset `otp_attempts` and brute-force
 * the code.
 */
async function sendOtpEmail(userId: string, email: string) {
  const code = generateOtpCode();
  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("admins")
    .update({ otp_code_hash: hashOtpCode(userId, code), otp_expires_at: otpExpiresAt(), otp_attempts: 0 })
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  const result = await sendEmail({
    to: email,
    subject: `Your Flow Admin sign-in code: ${code}`,
    html: `
      <p>Your sign-in code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>It expires in 10 minutes. If you didn't try to sign in, you can ignore this email.</p>
    `,
  });
  if (result.skipped || result.error) {
    throw new Error(
      "Email isn't configured (RESEND_API_KEY / EMAIL_FROM) — can't send a sign-in code."
    );
  }
}

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(String(formData.get("redirectTo") ?? ""));

  if (!serviceRoleConfigured()) {
    return fail(
      "Admin sign-in isn't fully configured (SUPABASE_SERVICE_ROLE_KEY missing) — contact whoever manages this deployment."
    );
  }

  if (!(await withinRateLimit("adminLogin"))) {
    return fail("Too many sign-in attempts from this network — wait a few minutes and try again.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Same message for "no such user" and "wrong password" — don't confirm which emails exist.
  if (error || !data.user) return fail("Incorrect email or password.");

  const userId = data.user.id;
  const { data: admin } = await createAdminClient()
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return fail("This account isn't authorized for admin access.");
  }

  try {
    await sendOtpEmail(userId, email);
  } catch (e) {
    await supabase.auth.signOut();
    return fail(e instanceof Error ? e.message : "Couldn't send a sign-in code.");
  }

  redirect(`/admin/login/verify?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function verifyOtp(_prevState: unknown, formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const redirectTo = safeRedirect(String(formData.get("redirectTo") ?? ""));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your sign-in expired — start again.");

  const service = createAdminClient();
  const { data: admin } = await service
    .from("admins")
    .select("otp_code_hash, otp_expires_at, otp_attempts")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin?.otp_code_hash || isOtpExpired(admin.otp_expires_at)) {
    return fail("That code has expired — request a new one.");
  }
  if (admin.otp_attempts >= OTP_MAX_ATTEMPTS) {
    return fail("Too many incorrect attempts — request a new code.");
  }

  // Claim this attempt *before* checking the code, conditioned on the count
  // we just read. Two concurrent guesses read the same count, but only one
  // of them can win this update — the other gets no row back and is turned
  // away, so the attempt limit can't be raced past.
  const { data: claimed } = await service
    .from("admins")
    .update({ otp_attempts: admin.otp_attempts + 1 })
    .eq("user_id", user.id)
    .eq("otp_attempts", admin.otp_attempts)
    .select("user_id");
  if (!claimed || claimed.length === 0) {
    return fail("Please try again.");
  }

  if (!/^\d{6}$/.test(code) || !verifyOtpCode(user.id, code, admin.otp_code_hash)) {
    const left = OTP_MAX_ATTEMPTS - (admin.otp_attempts + 1);
    return fail(left > 0 ? `Incorrect code — ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code. Request a new one.");
  }

  // Record this exact Supabase session as MFA-verified — the database's
  // is_mfa_admin() (0030) checks for it on every admin read and write.
  const { data: claims } = await supabase.auth.getClaims();
  const sessionId = claims?.claims?.session_id;
  if (!sessionId) return fail("Couldn't read your session — sign in again.");

  const expiresAt = new Date(Date.now() + AAL2_TTL_SECONDS * 1000).toISOString();
  const { error: sessionError } = await service
    .from("admin_mfa_sessions")
    .upsert({ session_id: sessionId, user_id: user.id, expires_at: expiresAt });
  if (sessionError) return fail("Couldn't complete sign-in — try again.");

  await service
    .from("admins")
    .update({ otp_code_hash: null, otp_expires_at: null, otp_attempts: 0, last_sign_in_at: new Date().toISOString() })
    .eq("user_id", user.id);
  await service.rpc("prune_admin_mfa_sessions");

  const cookie = signAal2Cookie(user.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });

  redirect(redirectTo);
}

export async function resendOtp(): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("Your sign-in expired — start again.");

  const { data: admin } = await createAdminClient()
    .from("admins")
    .select("user_id, otp_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) return fail("This account isn't authorized for admin access.");

  const sentAt = otpSentAt(admin.otp_expires_at);
  if (sentAt && Date.now() - sentAt < OTP_RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - sentAt)) / 1000);
    return fail(`A code was just sent — wait ${wait}s before requesting another.`);
  }

  try {
    await sendOtpEmail(user.id, user.email);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't send a sign-in code.");
  }
  return { success: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sessionId = claims?.claims?.session_id;
  if (sessionId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().from("admin_mfa_sessions").delete().eq("session_id", sessionId);
  }
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(AAL2_COOKIE_NAME);
  redirect("/admin/login");
}

/**
 * "Forgot password" — always answers the same way whether or not the email
 * belongs to an admin, so it can't be used to discover admin accounts.
 */
export async function requestPasswordReset(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const done = { success: true as const, message: "If that email belongs to an admin, a reset link is on its way." };
  if (!email || !process.env.SUPABASE_SERVICE_ROLE_KEY) return done;
  if (!(await withinRateLimit("adminLogin"))) {
    return fail("Too many requests from this network — wait a few minutes and try again.");
  }

  const service = createAdminClient();
  for (let page = 1; page <= 20; page++) {
    const { data } = await service.auth.admin.listUsers({ page, perPage: 200 });
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) {
      const { data: admin } = await service.from("admins").select("user_id").eq("user_id", match.id).maybeSingle();
      if (admin) await sendPasswordSetupEmail(email, "reset");
      break;
    }
    if (data.users.length < 200) break;
  }
  return done;
}

/** Consumes the one-time recovery token from the emailed link and sets the new password. */
export async function completePasswordReset(_prevState: unknown, formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 12) return fail("Use at least 12 characters.");
  if (password !== confirm) return fail("The passwords don't match.");
  if (!tokenHash) return fail("This link is incomplete — request a new one.");

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (verifyError) return fail("This link has expired or was already used — request a new one.");

  const { error } = await supabase.auth.updateUser({ password });
  // Signed out either way: they sign in normally next, with the emailed code.
  await supabase.auth.signOut();
  if (error) return fail(error.message);

  redirect("/admin/login?reset=1");
}
