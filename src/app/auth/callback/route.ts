import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ONBOARDING_COOKIE } from "@/lib/auth/onboarding";
import { getOwnerEmail } from "@/lib/auth/config";
import {
  getSiteOrigin,
  resolveAuthCallbackNextPath,
} from "@/lib/auth/site-url";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

function redirectTo(pathWithSearch: string) {
  const response = NextResponse.redirect(new URL(pathWithSearch, getSiteOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = resolveAuthCallbackNextPath(
    request.nextUrl.searchParams.get("next"),
    request.cookies.get(ONBOARDING_COOKIE)?.value,
  );

  if (!code) {
    return redirectTo("/login?error=invalid-link");
  }

  let response = redirectTo(nextPath);
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
        // Rebuild redirect so Set-Cookie lands on the response the browser follows.
        response = redirectTo(nextPath);
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo("/login?error=invalid-link");
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  let email =
    typeof claimsData?.claims.email === "string"
      ? claimsData.claims.email.toLowerCase()
      : null;

  if (!email) {
    const { data: userData } = await supabase.auth.getUser();
    email = userData.user?.email?.trim().toLowerCase() ?? null;
  }

  if (email !== getOwnerEmail()) {
    await supabase.auth.signOut();
    return redirectTo("/login?error=invalid-link");
  }

  return response;
}
