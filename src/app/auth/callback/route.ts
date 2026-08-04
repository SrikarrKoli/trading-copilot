import { NextResponse, type NextRequest } from "next/server";

import { getOwnerEmail } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-link", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-link", request.url),
    );
  }

  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims.email === "string"
      ? data.claims.email.toLowerCase()
      : null;

  if (email !== getOwnerEmail()) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=invalid-link", request.url),
    );
  }

  return NextResponse.redirect(new URL("/overview", request.url));
}
