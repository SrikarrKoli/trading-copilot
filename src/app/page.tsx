import Link from "next/link";

export const metadata = { title: "Market research workspace | Trading Copilot" };

const steps = [
  { title: "Bring your candidates", description: "Import a Thinkorswim scanner export to begin your review." },
  { title: "Examine the evidence", description: "Collect observations, weigh counter-evidence, and review setup rules." },
  { title: "Record your thinking", description: "Keep a journal of decisions and reflect on your research process." },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="border-b border-border pb-6 text-sm font-semibold tracking-wide">Trading Copilot <span className="font-normal text-muted">/ Research workspace</span></p>
      <section aria-labelledby="welcome-heading" className="py-12 sm:py-16">
        <p className="text-sm font-medium text-accent">A considered process. A clearer record.</p>
        <h1 id="welcome-heading" className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">A deliberate workspace for market research.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">Bring your Thinkorswim scanner exports, observable evidence, setup reviews, and journal into one place.</p>
        <Link href="/login" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-background hover:bg-accent-strong">Sign in to your workspace</Link>
        <p className="mt-3 text-sm text-muted">Private access for the workspace owner.</p>
      </section>
      <section aria-labelledby="process-heading">
        <h2 id="process-heading" className="text-lg font-semibold">From candidates to a considered review</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-border bg-card p-6">
              <span aria-hidden="true" className="font-mono text-sm text-accent">0{index + 1}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <aside aria-labelledby="boundaries-heading" className="mt-10 border-t border-border pt-6">
        <h2 id="boundaries-heading" className="text-sm font-semibold">Research only. Execution stays with you.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Trading Copilot never places trades and does not provide financial advice. Setup Alignment measures rule matching, not probability or confidence. Any execution happens manually in Thinkorswim.</p>
      </aside>
    </main>
  );
}
