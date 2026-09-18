import Link from "next/link";
import { redirect } from "next/navigation";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { acknowledgeResearch } from "./actions";

export default async function OnboardingPage() {
  if (!(await hasOwnerAccess())) redirect("/login");
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Before your first review</h1>
      <p className="mt-3 leading-6 text-muted">This is a research workspace, not financial advice. No analysis or AI output guarantees an outcome.</p>
      <form action={acknowledgeResearch} className="my-8 space-y-4 rounded-xl border border-border bg-card p-6">
        <fieldset className="space-y-4">
          <legend className="mb-4 font-semibold">Acknowledge each research boundary</legend>
          {[["research", "Trading Copilot never places trades."], ["alignment", "Setup Alignment is rule matching, not probability or confidence."], ["execution", "I handle any execution manually in Thinkorswim."]].map(([name, label]) => (
            <label key={name} className="flex items-start gap-3 text-sm leading-6"><input required type="checkbox" name={name} className="mt-1 size-4" />{label}</label>
          ))}
        </fieldset>
        <button className="rounded-lg bg-accent px-4 py-3 font-semibold text-background">Acknowledge and open overview</button>
      </form>
      <section aria-labelledby="demo-heading" className="rounded-xl border border-border p-6">
        <h2 id="demo-heading" className="text-lg font-semibold">DEMO dataset · Not live market data</h2>
        <p className="my-3 text-sm leading-6 text-muted">Fictional identifiers illustrate the review workflow. No quotes, Greeks, IV, or scores are supplied. These rows are never saved to your workspace.</p>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Demo research candidates</caption>
          <thead><tr><th scope="col" className="py-3">Demo candidate</th><th scope="col">Research step</th></tr></thead>
          <tbody>{[["DEMO-A", "Collect evidence"], ["DEMO-B", "Review counter-evidence"]].map(([symbol, step]) => <tr key={symbol} className="border-t border-border"><td className="py-3">{symbol}</td><td>{step}</td></tr>)}</tbody>
        </table>
        <Link href="/imports" className="mt-4 inline-block text-accent underline">Import your own scanner workbook</Link>
      </section>
    </main>
  );
}
