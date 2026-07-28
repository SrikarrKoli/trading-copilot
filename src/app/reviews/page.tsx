import { AlertTriangle, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ReviewQueue } from "@/components/review-queue";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { getReviewQueueSnapshot } from "@/lib/review/data";
import { getWatchlistOptions } from "@/lib/watchlist/data";

export default async function ReviewsPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  try {
    const [reviewSnapshot, watchlists] = await Promise.all([
      getReviewQueueSnapshot(),
      getWatchlistOptions(),
    ]);
    snapshot = { ...reviewSnapshot, watchlists };
  } catch (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Reviews" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-danger"
              />
              <h1 className="mt-4 text-xl font-semibold">
                Review queue is unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {error instanceof Error
                  ? error.message
                  : "The current candidates could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const openCount = snapshot.candidates.filter(
    ({ latestAction }) => !latestAction,
  ).length;
  const strategySavedCount = snapshot.candidates.filter(
    ({ strategyProgress }) =>
      strategyProgress && !strategyProgress.journalTradeId,
  ).length;
  const journaledCount = snapshot.candidates.filter(
    ({ strategyProgress }) => strategyProgress?.journalTradeId,
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Reviews" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
                <ClipboardCheck aria-hidden="true" className="size-3.5" />
                Decision capture
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Review every candidate deliberately.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Save, dismiss, defer, or add a candidate to a named watchlist.
                Every action retains its import provenance and does not place
                or prepare a trade.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 self-start sm:grid-cols-4 md:self-auto">
              {[
                ["Current", snapshot.counts.all],
                ["Open", openCount],
                ["Strategy saved", strategySavedCount],
                ["In Journal", journaledCount],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-24 rounded-xl border border-border bg-card px-3 py-2.5 text-center"
                >
                  <p className="font-mono text-lg font-semibold">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <div className="mb-6 rounded-xl border border-warning/20 bg-warning/[0.055] px-4 py-3 text-xs leading-5 text-[#e9d2a0]">
            Setup Alignment appears here only after a complete manual
            assessment is saved; it measures rule matching, not investment
            confidence. Watchlists preserve deliberate research choices even
            after a new daily scanner import replaces this queue.{" "}
            <Link href="/evidence" className="font-medium underline">
              Assess evidence
            </Link>
            {" · "}
            <Link href="/watchlists" className="font-medium underline">
              Manage watchlists
            </Link>
          </div>

          <ReviewQueue
            candidates={snapshot.candidates}
            watchlists={snapshot.watchlists}
          />
        </div>
      </main>
    </div>
  );
}
