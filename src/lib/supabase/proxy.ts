import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getOwnerEmail, hostnameFromHost, isAuthBypassEnabled, isTempAuthUnlockEnabled } from "@/lib/auth/config";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

import { ONBOARDING_COOKIE, ownerStartPath } from "@/lib/auth/onboarding";

const publicPaths = [
  "/login",
  "/forgot-password",
  "/update-password",
  "/auth/callback",
  "/api/health/supabase",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabasePublicEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  function redirectWithSession(url: URL) {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims.email === "string"
      ? data.claims.email.toLowerCase()
      : null;
  const isPermanentOwner = email === getOwnerEmail();
  const tempUnlock = isTempAuthUnlockEnabled();
  const hasDevelopmentAccess =
    isPermanentOwner ||
    isAuthBypassEnabled(hostnameFromHost(request.headers.get("host")));
  const isPublicPath = request.nextUrl.pathname === "/" || publicPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (!hasDevelopmentAccess && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return redirectWithSession(loginUrl);
  }

  // Real owner: send / and /login into the app. Temp unlock: only / (keep /login for banner + real auth).
  const enterAppPaths = isPermanentOwner
    ? ["/", "/login"]
    : tempUnlock
      ? ["/"]
      : [];
  if (enterAppPaths.includes(request.nextUrl.pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = ownerStartPath(request.cookies.get(ONBOARDING_COOKIE)?.value);
    homeUrl.search = "";
    return redirectWithSession(homeUrl);
  }

  return response;
}
