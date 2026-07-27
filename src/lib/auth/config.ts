export function getOwnerEmail() {
  const email = process.env.AUTH_OWNER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error("AUTH_OWNER_EMAIL is not configured.");
  }

  return email;
}

export function isLocalAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_AUTH_BYPASS === "true"
  );
}
