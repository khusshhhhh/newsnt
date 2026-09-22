import { Resend } from "resend";

/**
 * Thin wrapper so the rest of the app never touches the Resend SDK directly.
 * No-ops (with a console warning) when `RESEND_API_KEY` isn't set, so local
 * dev and preview environments without email configured don't crash —
 * inquiries/reviews/etc. still get written to the DB either way, email is
 * just a notification on top.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "sendEmail skipped: RESEND_API_KEY/EMAIL_FROM not configured.",
      params.subject
    );
    return { skipped: true as const };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });

  if (error) {
    console.error("sendEmail failed:", error);
    return { skipped: false as const, error: error.message };
  }

  return { skipped: false as const };
}
