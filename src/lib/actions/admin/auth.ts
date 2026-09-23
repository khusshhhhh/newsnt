"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import {
  AAL2_COOKIE_NAME,
  OTP_MAX_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  mfaSecret,
  otpExpiresAt,
  signAal2Cookie,
  verifyOtpCode,
} from "@/lib/admin-mfa";
import { fail } from "./_shared";

async function sendOtpEmail(userId: string, email: string) {
  const code = generateOtpCode();
  const supabase = await createClient();

  const { error: updateError } = await supabase
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
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  if (!mfaSecret()) {
    return fail(
      "Admin sign-in isn't fully configured (ADMIN_MFA_SECRET / SUPABASE_SERVICE_ROLE_KEY missing) — contact whoever manages this deployment."
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(error.message);
  if (!data.user) return fail("Sign-in failed.");

  const userId = data.user.id;
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
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

  redirect(`/admin/login/verify?redirectTo=${encodeURIComponent(redirectTo || "/admin")}`);
}

export async function verifyOtp(_prevState: unknown, formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your sign-in expired — start again.");

  const { data: admin } = await supabase
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
  if (!/^\d{6}$/.test(code) || !verifyOtpCode(user.id, code, admin.otp_code_hash)) {
    await supabase
      .from("admins")
      .update({ otp_attempts: admin.otp_attempts + 1 })
      .eq("user_id", user.id);
    return fail("Incorrect code.");
  }

  await supabase
    .from("admins")
    .update({ otp_code_hash: null, otp_expires_at: null, otp_attempts: 0 })
    .eq("user_id", user.id);

  const cookie = signAal2Cookie(user.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });

  redirect(redirectTo || "/admin");
}

export async function resendOtp(): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("Your sign-in expired — start again.");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) return fail("This account isn't authorized for admin access.");

  try {
    await sendOtpEmail(user.id, user.email);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't send a sign-in code.");
  }
  return { success: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(AAL2_COOKIE_NAME);
  redirect("/admin/login");
}
