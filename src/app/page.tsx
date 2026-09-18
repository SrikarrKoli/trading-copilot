import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <p className="text-sm font-semibold text-accent">Trading Copilot · Research OS</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">A deliberate workspace for market research.</h1>
      <p className="mt-6 max-w-2xl leading-7 text-muted">Bring your Thinkorswim scanner exports together with observable evidence, setup reviews, strategy illustrations, and a journal.</p>
      <ol className="my-10 grid gap-4 sm:grid-cols-3">
        {["Import scanner candidates", "Assess evidence and review setups", "Journal and learn from your process"].map((step, index) => (
          <li key={step} className="rounded-xl border border-border bg-card p-5"><span className="text-sm text-muted">0{index + 1}</span><p className="mt-3">{step}</p></li>
        ))}
      </ol>
      <p className="mb-8 text-sm leading-6 text-muted">Research only, not financial advice. Trading Copilot never places trades. Setup Alignment measures rule matching, not probability or confidence. AI does not guarantee outcomes. Any execution happens manually in Thinkorswim.</p>
      <Link href="/login" className="inline-block rounded-lg bg-accent px-5 py-3 font-semibold text-background">Sign in to your workspace</Link>
    </main>
  );
}
