import Link from "next/link";
import { Mail } from "lucide-react";

import { requestOwnerPasswordReset } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string | string[] }>;
}) {
  const query = await searchParams;
  const sent = query.sent === "1";

  return (
    <AuthShell
      description="Email is used only for account recovery, not for routine sign-in."
      eyebrow="Account / Password reset"
      icon={Mail}
      title="Password reset"
    >
        {sent ? (
          <p
            className="rounded-[18px] border border-accent/20 bg-accent/[0.06] p-4 text-sm leading-6"
            role="status"
          >
            If that address is the owner account, a recovery link has been
            sent. Check your inbox and spam folder.
          </p>
        ) : (
          <form action={requestOwnerPasswordReset} className="space-y-4">
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
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
            <button
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:-translate-y-0.5 hover:bg-accent-strong"
              type="submit"
            >
              Send recovery link
            </button>
          </form>
        )}

        <Link
          className="mt-5 block text-center text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
          href="/login"
        >
          Return to sign in
        </Link>
    </AuthShell>
  );
}
