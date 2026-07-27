import Link from "next/link";
import { Mail } from "lucide-react";

import { requestOwnerPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string | string[] }>;
}) {
  const query = await searchParams;
  const sent = query.sent === "1";

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
        <div className="mb-7 grid size-11 place-items-center rounded-2xl border border-border bg-white/[0.035]">
          <Mail aria-hidden="true" className="size-5 text-accent" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Email is used only for account recovery, not for routine sign-in.
        </p>

        {sent ? (
          <p
            className="mt-7 rounded-2xl border border-accent/30 bg-accent/[0.07] p-4 text-sm leading-6"
            role="status"
          >
            If that address is the owner account, a recovery link has been
            sent. Check your inbox and spam folder.
          </p>
        ) : (
          <form action={requestOwnerPasswordReset} className="mt-7 space-y-4">
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
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
            <button
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong"
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
      </section>
    </main>
  );
}
