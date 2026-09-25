import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { emailButton, emailLayout, emailNote, emailParagraph, emailSteps } from "@/lib/email-layout";

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
  const subject = kind === "invite" ? "You've been added to the Flow admin panel" : "Reset your Flow admin password";
  const result = await sendEmail({
    to: email,
    subject,
    html: emailLayout(
      kind === "invite"
        ? {
            title: subject,
            preheader: "Set your password to start using the Flow admin panel. The link expires in an hour.",
            eyebrow: "Welcome to the team",
            heading: "You've been added to the Flow admin panel",
            audience: "staff",
            reason: "Sent because an owner added this address to the Flow admin panel.",
            body: [
              emailParagraph(
                "You've been given access to the Flow admin panel — where the team manages the catalogue, inquiries, quotes and orders."
              ),
              emailButton(url, "Set your password"),
              emailSteps([
                ["Set a password", "Use at least 12 characters. The button above works once and expires in an hour."],
                ["Sign in", `Head to <a href="${SITE_URL}/admin/login" style="color:#111111;">the admin sign-in page</a> with your email and new password.`],
                ["Enter your code", "Each time you sign in we'll email you a 6-digit code to confirm it's you."],
              ]),
              emailNote("Weren't expecting this? You can ignore this email — nothing happens until a password is set."),
            ].join(""),
          }
        : {
            title: subject,
            preheader: "Choose a new password for your Flow admin account. The link expires in an hour.",
            eyebrow: "Password reset",
            heading: "Reset your password",
            audience: "staff",
            reason: "Sent because a password reset was requested for this Flow admin account.",
            body: [
              emailParagraph("Someone asked to reset the password for this Flow admin account."),
              emailButton(url, "Choose a new password"),
              emailNote("The link works once and expires in an hour."),
              emailNote("<strong>Wasn't you?</strong> You can ignore this email — your password hasn't changed."),
            ].join(""),
          }
    ),
  });
  return { sent: !result.skipped && !result.error };
}
