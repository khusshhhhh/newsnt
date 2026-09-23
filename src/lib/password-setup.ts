import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/**
 * Emails a one-time link to /admin/login/reset for setting (invite) or
 * resetting (forgot) a password. Uses Supabase's recovery token, but our own
 * email + URL, so the link lands on a page that verifies the token server
 * side (`verifyOtp({ type: "recovery", token_hash })`) — no client-side
 * hash-fragment handling needed.
 */
export async function sendPasswordSetupEmail(email: string, kind: "invite" | "reset") {
  const service = createAdminClient();
  const { data, error } = await service.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) {
    console.error("generateLink failed:", error);
    return { sent: false };
  }

  const url = `${SITE_URL}/admin/login/reset?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  const result = await sendEmail({
    to: email,
    subject: kind === "invite" ? "You've been added to the Flow admin panel" : "Reset your Flow admin password",
    html:
      kind === "invite"
        ? `<p>You've been given access to the Flow admin panel.</p>
           <p><a href="${url}">Set your password</a> to get started. The link works once and expires in an hour.</p>
           <p>Each time you sign in you'll also be emailed a 6-digit code.</p>`
        : `<p>Someone asked to reset the password for this Flow admin account.</p>
           <p><a href="${url}">Choose a new password</a>. The link works once and expires in an hour.</p>
           <p>If this wasn't you, you can ignore this email — your password hasn't changed.</p>`,
  });
  return { sent: !result.skipped && !result.error };
}
