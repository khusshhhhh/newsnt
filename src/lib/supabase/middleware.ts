import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AAL2_COOKIE_NAME, verifyAal2Cookie } from "@/lib/admin-mfa";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";
  const isVerifyPage = pathname === "/admin/login/verify";
  const isAuthRoute = isLoginPage || isVerifyPage;

  if (isAdminRoute && !isAuthRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const aal2Valid = verifyAal2Cookie(request.cookies.get(AAL2_COOKIE_NAME)?.value, user.id);

    // Password step is done but the emailed code hasn't been verified yet
    // (or its cookie expired) — every admin route, including the login page
    // itself, funnels through the OTP challenge before anything else.
    if (isAdminRoute && !isVerifyPage && !aal2Valid) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login/verify";
      url.search = "";
      url.searchParams.set(
        "redirectTo",
        isLoginPage ? request.nextUrl.searchParams.get("redirectTo") || "/admin" : pathname
      );
      return NextResponse.redirect(url);
    }

    if (isAuthRoute && aal2Valid) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
