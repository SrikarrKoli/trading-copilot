import Link from "next/link";
import { redirect } from "next/navigation";

import { hasOwnerAccess } from "@/lib/auth/owner";
import { acknowledgeResearch } from "./actions";

const acknowledgements = [
  ["research", "Trading Copilot never places, stages, or submits trades."],
  [
    "alignment",
    "Setup Alignment is deterministic rule matching—not probability, confidence, or a recommendation.",
  ],
  [
    "execution",
    "Any execution happens manually in Thinkorswim under my own judgment.",
  ],
] as const;

const demoRows = [
  ["DEMO-A", "Bullish research", "Collect evidence"],
  ["DEMO-B", "Bearish research", "Review counter-evidence"],
  ["DEMO-C", "Neutral research", "Defer until observation time exists"],
] as const;

export const metadata = { title: "Getting started | Trading Copilot" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  const query = await searchParams;
  const errorCode = typeof query.error === "string" ? query.error : undefined;

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8 sm:py-16 text-foreground">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          First-run checklist
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Before your first review
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          This is a research workspace, not financial advice. Rule matching does not predict a trade’s outcome. Acknowledge the boundaries, preview the
          demo labels, then import your own scanner workbook.
        </p>

        <form
          action={acknowledgeResearch}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold">
              Acknowledge each research boundary
            </legend>
            <p className="text-sm leading-6 text-muted">All three acknowledgments are required to continue.</p>
            {acknowledgements.map(([name, label]) => (
              <label
                key={name}
                className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm leading-6 hover:bg-card-elevated"
              >
                <input
                  required
                  type="checkbox"
                  name={name}
                  className="mt-0.5 size-5 shrink-0 rounded border-border accent-[var(--accent)]"
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {errorCode === "acknowledgement-required" ? (
            <p className="rounded-xl border border-danger/30 bg-danger/[0.07] px-4 py-3 text-sm leading-6 text-danger" role="alert">
              Check every boundary before continuing.
            </p>
          ) : null}
          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-accent sm:w-auto px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong"
          >
            Acknowledge and open overview
          </button>
        </form>

        <section
          aria-labelledby="demo-heading"
          className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="demo-heading" className="text-lg font-semibold">
              DEMO dataset
            </h2>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted">
              Not live market data
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Fictional identifiers illustrate the review workflow only. No quotes,
            Greeks, IV, probabilities, or scores are supplied. These rows are
            never saved to your workspace.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Demo research candidates</caption>
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Demo candidate
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Direction label
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Research step
                  </th>
                </tr>
              </thead>
              <tbody>
                {demoRows.map(([symbol, direction, step]) => (
                  <tr key={symbol} className="border-t border-border">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold">
                      {symbol}
                    </td>
                    <td className="py-3 pr-4 text-muted">{direction}</td>
                    <td className="py-3 text-muted">{step}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            href="/imports"
            className="mt-5 inline-flex min-h-11 items-center rounded text-sm font-medium text-accent underline underline-offset-4"
          >
            Import your own scanner workbook
          </Link>
        </section>
      </div>
    </main>
  );
}
