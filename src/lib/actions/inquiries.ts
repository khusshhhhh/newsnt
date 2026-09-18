"use server";

import { z } from "zod";
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

export async function submitInquiry(
  _prevState: InquiryState | null,
  formData: FormData
): Promise<InquiryState> {
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
    const productLine = parsed.data.product_ids?.length
      ? `<p>${parsed.data.product_ids.length} product(s) referenced (see admin panel for details).</p>`
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
