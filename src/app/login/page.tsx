import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { signInOwnerWithPassword } from "@/app/auth/actions";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";

export const metadata = { title: "Sign in | Trading Copilot" };

const errorMessages: Record<string, string> = {
  "invalid-credentials": "The email or password is incorrect.",
  "invalid-link": "That recovery link is invalid or expired.",
  "rate-limited": "Too many failed attempts. Wait 15 minutes and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (await getPermanentOwnerClaims()) {
    redirect("/");
  }

  const query = await searchParams;
  const errorCode =
    typeof query.error === "string" ? query.error : undefined;
  const message = errorCode ? errorMessages[errorCode] : undefined;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 sm:px-8">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-7 grid size-11 place-items-center rounded-2xl border border-border bg-white/[0.035]">
          <LockKeyhole aria-hidden="true" className="size-5 text-accent" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to Trading Copilot
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in with your workspace owner account to continue your research.
        </p>

        <p className="mt-3 text-sm leading-6 text-muted">Research only. Trading Copilot never places trades.</p>

        <form aria-describedby={message ? "login-error" : undefined} action={signInOwnerWithPassword} className="mt-7 space-y-4">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-[#687586] bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-[#687586] bg-background px-4 py-3 text-base text-foreground focus:border-accent"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          <button
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            className="inline-flex min-h-11 items-center rounded text-sm text-muted underline underline-offset-4 hover:text-foreground"
            href="/forgot-password"
          >
            Forgot or need to create your password?
          </Link>
        </div>

        {message ? (
          <p
            className="mt-4 rounded-xl border border-danger/30 bg-danger/[0.07] px-4 py-3 text-sm leading-6 text-danger"
            id="login-error"
            role="alert"
          >
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
