import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { updateOwnerPassword } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";

const errorMessages: Record<string, string> = {
  "invalid-password":
    "Passwords must match and contain at least 12 characters.",
  "update-failed":
    "The password could not be updated. Request a new recovery link and try again.",
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (!(await getPermanentOwnerClaims())) {
    redirect("/login");
  }

  const query = await searchParams;
  const errorCode =
    typeof query.error === "string" ? query.error : undefined;
  const message = errorCode ? errorMessages[errorCode] : undefined;

  return (
    <AuthShell
      description="Use a unique password with at least 12 characters. It is sent directly to Supabase Auth and is never stored by this application."
      eyebrow="Secure recovery"
      icon={KeyRound}
      title="Choose a new password"
    >
        <form action={updateOwnerPassword} className="space-y-4">
          <div>
            <label
              className="mb-2 block text-xs font-medium text-muted"
              htmlFor="password"
            >
              New password
            </label>
            <input
              autoComplete="new-password"
              autoFocus
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-foreground focus:border-accent"
              id="password"
              minLength={12}
              name="password"
              required
              type="password"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-xs font-medium text-muted"
              htmlFor="passwordConfirmation"
            >
              Confirm new password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-foreground focus:border-accent"
              id="passwordConfirmation"
              minLength={12}
              name="passwordConfirmation"
              required
              type="password"
            />
          </div>
          <button
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:-translate-y-0.5 hover:bg-accent-strong"
            type="submit"
          >
            Save password
          </button>
        </form>

        {message ? (
          <p
            className="mt-4 rounded-xl border border-danger/30 bg-danger/[0.07] px-4 py-3 text-xs leading-5 text-danger"
            role="alert"
          >
            {message}
          </p>
        ) : null}
    </AuthShell>
  );
}
