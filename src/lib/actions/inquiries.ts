"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENTS } from "@/lib/department";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  department: z.enum(DEPARTMENTS),
  product_ids: z.array(z.string().uuid()).optional(),
  name: z.string().trim().min(1, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(1, "Add a short message"),
});

export type InquiryState = { error?: string; success?: boolean };

// Anti-spam: a hidden "company" field real visitors never see or fill, and a
// minimum time between the form opening and submitting — both catch
// scripted/bot submissions without ever showing a CAPTCHA to a real person.
const HONEYPOT_FIELD = "company";
const MIN_SUBMIT_MS = 1200;

// Per-browser submission cap so a script can't loop the form indefinitely.
// Cookie-based rather than IP-based since this app has no server-side store
// for that; a real visitor filling out a form by hand will never get close
// to the limit.
const RATE_LIMIT_COOKIE = "flow_inquiry_rl";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

async function checkAndBumpRateLimit(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RATE_LIMIT_COOKIE)?.value;
  const now = Date.now();

  let count = 0;
  let windowStart = now;
  if (raw) {
    const [countStr, startStr] = raw.split(":");
    const parsedCount = Number(countStr);
    const parsedStart = Number(startStr);
    if (
      Number.isFinite(parsedCount) &&
      Number.isFinite(parsedStart) &&
      now - parsedStart < RATE_LIMIT_WINDOW_MS
    ) {
      count = parsedCount;
      windowStart = parsedStart;
    }
  }

  if (count >= RATE_LIMIT_MAX) return false;

  cookieStore.set(RATE_LIMIT_COOKIE, `${count + 1}:${windowStart}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: RATE_LIMIT_WINDOW_MS / 1000,
    path: "/",
  });
  return true;
}

export async function submitInquiry(
  _prevState: InquiryState | null,
  formData: FormData
): Promise<InquiryState> {
  const withinLimit = await checkAndBumpRateLimit();
  if (!withinLimit) {
    return { error: "Too many requests from this browser — please try again in a few minutes." };
  }

  // Bots tend to fill every field and submit instantly — a filled honeypot
  // or a near-zero elapsed time is treated as spam. We report success
  // without saving anything, rather than an error, so scripts get no signal
  // to adapt to.
  const honeypot = formData.get(HONEYPOT_FIELD);
  const elapsedMs = Number(formData.get("elapsed_ms"));
  if (
    (typeof honeypot === "string" && honeypot.trim().length > 0) ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < MIN_SUBMIT_MS
  ) {
    return { success: true };
  }

  const productIdsRaw = formData.get("product_ids");
  const parsed = schema.safeParse({
    department: formData.get("department"),
    product_ids: typeof productIdsRaw === "string" && productIdsRaw
      ? productIdsRaw.split(",").filter(Boolean)
      : undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    department: parsed.data.department,
    product_ids: parsed.data.product_ids ?? null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message,
  });

  if (error) {
    return { error: "Something went wrong — try again." };
  }

  const notifyTo = process.env.INQUIRY_NOTIFICATION_EMAIL;
  if (notifyTo) {
    const totalQuantity = parsed.data.product_ids?.length ?? 0;
    const distinctProducts = new Set(parsed.data.product_ids ?? []).size;
    const productLine =
      totalQuantity > 0
        ? `<p>${totalQuantity} item${totalQuantity === 1 ? "" : "s"} across ${distinctProducts} product${distinctProducts === 1 ? "" : "s"} referenced (see admin panel for details).</p>`
        : "";
    await sendEmail({
      to: notifyTo,
      subject: `New inquiry — ${parsed.data.name}`,
      html: `
        <p><strong>Department:</strong> ${parsed.data.department}</p>
        <p><strong>From:</strong> ${parsed.data.name} (${parsed.data.email}${parsed.data.phone ? `, ${parsed.data.phone}` : ""})</p>
        ${productLine}
        <p><strong>Message:</strong></p>
        <p>${parsed.data.message.replace(/\n/g, "<br/>")}</p>
      `,
    });
  }

  return { success: true };
}
