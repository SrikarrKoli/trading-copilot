"use server";

import { redirect } from "next/navigation";

import { getOwnerEmail } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

function getSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  return new URL(configuredUrl).origin;
}

export async function requestOwnerMagicLink(formData: FormData) {
  const submittedEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (submittedEmail === getOwnerEmail()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: submittedEmail,
      options: {
        emailRedirectTo: `${getSiteOrigin()}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      redirect("/login?error=link-send-failed");
    }
  }

  // Always return the same success state so this action does not reveal the
  // configured owner email.
  redirect("/login?sent=1");
}

export async function signOutOwner() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
