"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { ONBOARDING_COOKIE, ONBOARDING_VERSION } from "@/lib/auth/onboarding";

export async function acknowledgeResearch(formData: FormData) {
  if (!(await hasOwnerAccess())) redirect("/login");
  if (!["research", "alignment", "execution"].every((key) => formData.get(key) === "on")) {
    redirect("/onboarding?error=acknowledgement-required");
  }
  (await cookies()).set(ONBOARDING_COOKIE, ONBOARDING_VERSION, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/overview");
}
