"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ONBOARDING_COOKIE, ownerStartPath } from "@/lib/auth/onboarding";
import { getAuthCallbackUrl } from "@/lib/auth/site-url";
import { getOwnerEmail } from "@/lib/auth/config";
import {
  canAttemptOwnerLogin,
  clearOwnerLoginFailures,
  recordOwnerLoginFailure,
} from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/supabase/server";

async function getLoginClientKey() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown-client"
  );
}

export async function signInOwnerWithPassword(formData: FormData) {
  const submittedEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const clientKey = await getLoginClientKey();

  if (!canAttemptOwnerLogin(clientKey)) {
    redirect("/login?error=rate-limited");
  }

  if (submittedEmail !== getOwnerEmail() || password.length === 0) {
    recordOwnerLoginFailure(clientKey);
    redirect("/login?error=invalid-credentials");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: submittedEmail,
    password,
  });

  if (
    error ||
    data.user?.email?.trim().toLowerCase() !== getOwnerEmail()
  ) {
    if (data.session) {
      await supabase.auth.signOut();
    }
    recordOwnerLoginFailure(clientKey);
    redirect("/login?error=invalid-credentials");
  }

  clearOwnerLoginFailures(clientKey);
  redirect(ownerStartPath((await cookies()).get(ONBOARDING_COOKIE)?.value));
}

export async function requestOwnerPasswordReset(formData: FormData) {
  const submittedEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (submittedEmail === getOwnerEmail()) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(submittedEmail, {
      redirectTo: getAuthCallbackUrl("/update-password"),
    });
  }

  // Always return the same result so this endpoint does not reveal whether an
  // email address is the configured owner.
  redirect("/forgot-password?sent=1");
}

export async function updateOwnerPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email =
    typeof claimsData?.claims.email === "string"
      ? claimsData.claims.email.toLowerCase()
      : null;

  if (email !== getOwnerEmail()) {
    redirect("/login");
  }

  if (password.length < 12 || password !== confirmation) {
    redirect("/update-password?error=invalid-password");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/update-password?error=update-failed");
  }

  redirect(ownerStartPath((await cookies()).get(ONBOARDING_COOKIE)?.value));
}

export async function signOutOwner() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
