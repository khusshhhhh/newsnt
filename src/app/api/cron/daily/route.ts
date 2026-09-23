import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pruneOldRows, retryFailedInquiryNotifications, sendDailyDigest } from "@/lib/ops";

/**
 * Daily housekeeping, run by Vercel Cron (see vercel.json): retry failed
 * inquiry notification emails, email staff a summary of what needs
 * attention, and prune expired rows. Vercel sends `Authorization: Bearer
 * $CRON_SECRET`; anything without it is rejected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const retried = await retryFailedInquiryNotifications(supabase);
  const digest = await sendDailyDigest(supabase);
  await pruneOldRows(supabase);

  return NextResponse.json({ retried, digest });
}
