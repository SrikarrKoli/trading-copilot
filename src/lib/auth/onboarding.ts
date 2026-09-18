export const ONBOARDING_COOKIE = "research_acknowledgement";
export const ONBOARDING_VERSION = "v1";

export function ownerStartPath(acknowledgement?: string) {
  return acknowledgement === ONBOARDING_VERSION ? "/overview" : "/onboarding";
}
