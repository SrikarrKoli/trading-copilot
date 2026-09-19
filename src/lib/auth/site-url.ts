import { ownerStartPath } from "@/lib/auth/onboarding";

/** Configured application origin; never derive auth redirects from request headers. */
export function getSiteOrigin(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl?.trim()) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) URL.");
  }
  return url.origin;
}

const ALLOWED_CALLBACK_NEXT = "/update-password" as const;

export function getAuthCallbackUrl(nextPath?: string): string {
  if (nextPath !== undefined && nextPath !== ALLOWED_CALLBACK_NEXT) {
    throw new Error("Unsupported auth callback next path.");
  }
  const callback = `${getSiteOrigin()}/auth/callback`;
  return nextPath
    ? `${callback}?next=${encodeURIComponent(nextPath)}`
    : callback;
}

/**
 * Allowlist-only resolver for auth callback `next`.
 * Only `/update-password` is an explicit destination; everything else uses onboarding start.
 */
export function resolveAuthCallbackNextPath(
  requestedNext: string | null | undefined,
  acknowledgement?: string,
): string {
  const trimmed = requestedNext?.trim() ?? "";
  if (trimmed === ALLOWED_CALLBACK_NEXT) {
    return ALLOWED_CALLBACK_NEXT;
  }
  return ownerStartPath(acknowledgement);
}
