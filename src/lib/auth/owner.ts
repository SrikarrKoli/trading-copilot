import { getOwnerEmail, isLocalAuthBypassEnabled } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

export async function getPermanentOwnerClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims) {
    return null;
  }

  const email =
    typeof claims.email === "string" ? claims.email.toLowerCase() : null;

  return email === getOwnerEmail() ? claims : null;
}

export async function hasOwnerAccess() {
  if (isLocalAuthBypassEnabled()) {
    return true;
  }

  return Boolean(await getPermanentOwnerClaims());
}
