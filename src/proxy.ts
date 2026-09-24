import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the admin panel has a Supabase session to refresh or gate. The
  // storefront and the public /quote page never read one, so running this
  // there only added an Auth round-trip (getUser) to every page view and
  // prefetch — scoping it to /admin keeps public pages off that path.
  matcher: ["/admin/:path*"],
};
