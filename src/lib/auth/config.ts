export function getOwnerEmail() {
  const email = process.env.AUTH_OWNER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error("AUTH_OWNER_EMAIL is not configured.");
  }

  return email;
}

export function isTempAuthUnlockEnabled() {
  return process.env.TEMP_AUTH_UNLOCK === "true";
}

export function isLocalAuthBypassEnabled(hostname?: string | null) {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_AUTH_BYPASS === "true" &&
    Boolean(hostname && /^(localhost|127\.0\.0\.1|\[::1\]|::1|0\.0\.0\.0)$/i.test(hostname))
  );
}

export function isAuthBypassEnabled(hostname?: string | null) {
  return isTempAuthUnlockEnabled() || isLocalAuthBypassEnabled(hostname);
}

// Accept only a Host authority, never forwarded headers, URLs, or userinfo.
export function hostnameFromHost(host: string | null): string | undefined {
  if (!host) return undefined;
  const match = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(?::[0-9]{1,5})?$/i.exec(host);
  return match?.[1];
}
