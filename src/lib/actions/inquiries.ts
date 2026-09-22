"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENTS } from "@/lib/department";
import { sendEmail } from "@/lib/email";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.coerce.number().int().positive().max(999),
});

const schema = z.object({
  department: z.enum(DEPARTMENTS),
  product_ids: z.array(z.string().uuid()).optional(),
  items: z.array(itemSchema).optional(),
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

// Per-IP submission cap enforced server-side via the check_inquiry_rate_limit
// Postgres function (see supabase/migrations/0024_inquiry_rate_limits.sql) —
// unlike a cookie, this can't be reset by the visitor just clearing their
// browser storage. A real person filling out the form by hand will never
// get close to the limit.
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX = 5;

async function clientIdentifier(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}

export async function submitInquiry(
  _prevState: InquiryState | null,
  formData: FormData
): Promise<InquiryState> {
  const supabase = await createClient();

  const { data: withinLimit, error: rateLimitError } = await supabase.rpc(
    "check_inquiry_rate_limit",
    {
      p_identifier: await clientIdentifier(),
      p_max_count: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    }
  );
  // A rate-limit check failure (e.g. transient DB error) fails open — we'd
  // rather risk a little spam than block a real customer's request.
  if (!rateLimitError && withinLimit === false) {
    return { error: "Too many requests from this network — please try again in a few minutes." };
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
  const itemsRaw = formData.get("items");
  let items: unknown;
  if (typeof itemsRaw === "string" && itemsRaw) {
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      return { error: "Check the form and try again." };
    }
  }

  const parsed = schema.safeParse({
    department: formData.get("department"),
    product_ids: typeof productIdsRaw === "string" && productIdsRaw
      ? productIdsRaw.split(",").filter(Boolean)
      : undefined,
    items,
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  // `product_ids` (one id repeated per unit) is derived from the structured
  // `items` when present, so anything still reading the old column — and
  // rows submitted before `items` existed — keep working unchanged.
  const productIds = parsed.data.items
    ? parsed.data.items.flatMap((item) => Array<string>(item.quantity).fill(item.product_id))
    : (parsed.data.product_ids ?? null);

  // Every inquiry belongs to a customer, keyed by email — upsert_customer()
  // creates the customer on first contact and refreshes name/phone/
  // department on every later one, so a customer's profile always reflects
  // their most recent submission without any manual CRM data entry.
  const { data: customerId, error: customerError } = await supabase.rpc("upsert_customer", {
    p_email: parsed.data.email,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone ?? null,
    p_department: parsed.data.department,
  });
  if (customerError) {
    return { error: "Something went wrong — try again." };
  }

  const { error } = await supabase.from("inquiries").insert({
    department: parsed.data.department,
    product_ids: productIds,
    items: parsed.data.items ?? null,
    customer_id: customerId,
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
