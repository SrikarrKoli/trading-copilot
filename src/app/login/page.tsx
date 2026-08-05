import { Mail } from "lucide-react";
import { redirect } from "next/navigation";

import { requestOwnerMagicLink } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { SignalActionButton } from "@/components/ui/button";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";

const errorMessages: Record<string, string> = {
  "invalid-link": "That sign-in link is invalid or expired. Request a new one.",
  "link-send-failed": "The sign-in link could not be sent. Try again shortly.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    sent?: string | string[];
  }>;
}) {
  if (await getPermanentOwnerClaims()) {
    redirect("/");
  }

  const query = await searchParams;
  const errorCode =
    typeof query.error === "string" ? query.error : undefined;
  const message = errorCode ? errorMessages[errorCode] : undefined;
  const sent = query.sent === "1";

  return (
    <AuthShell
      description="Enter the permanent owner email. We’ll send a one-time link that signs you in without a password."
      eyebrow="Account / Sign in"
      icon={Mail}
      title="Email sign-in"
    >
      {sent ? (
        <p
          className="rounded-lg border border-accent/20 bg-accent/[0.06] p-4 text-sm leading-6"
          role="status"
        >
          If that address is the owner account, a one-time sign-in link has
          been sent. Check your inbox and spam folder.
        </p>
      ) : (
        <form action={requestOwnerMagicLink} className="space-y-4">
          <div>
            <label
              className="mb-2 block text-xs font-medium text-muted"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              autoFocus
              className="w-full rounded-md border border-white/[0.1] bg-black/20 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <SignalActionButton className="w-full" type="submit">
            Email sign-in link
          </SignalActionButton>
        </form>
      )}

      {message ? (
        <p
          className="mt-4 rounded-md border border-danger/30 bg-danger/[0.07] px-4 py-3 text-xs leading-5 text-danger"
          role="alert"
        >
          {message}
        </p>
      ) : null}
    </AuthShell>
  );
}
