"use client";
import Link from "next/link";
export function WorkspaceError({ unstable_retry }: { unstable_retry: () => void }) {
  return <main className="mx-auto max-w-2xl px-5 py-16"><section role="alert" className="workspace-panel border-danger/25">
    <p className="workspace-label">Trading Copilot · research workspace</p>
    <h1 className="mt-3 text-xl font-semibold">This workspace could not be loaded</h1>
    <p className="mt-2 text-sm leading-6 text-muted">Retry to reload your research. If you were saving a change, check its current state before submitting it again.</p>
    <div className="mt-5 flex gap-4 items-center"><button onClick={unstable_retry} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background">Try again</button><Link href="/overview" className="text-sm text-accent">Return to overview</Link></div>
  </section></main>;
}
