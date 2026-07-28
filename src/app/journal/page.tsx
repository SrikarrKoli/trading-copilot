import { AlertTriangle, BookOpenText } from "lucide-react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { JournalWorkspace } from "@/components/journal-workspace";
import { hasOwnerAccess } from "@/lib/auth/owner";
import {
  getJournalSnapshot,
  getJournalSourceOptions,
} from "@/lib/journal/data";

function formatPnl(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: "always",
    style: "currency",
  }).format(value);
}

export default async function JournalPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  let sourceOptions;
  try {
    [snapshot, sourceOptions] = await Promise.all([
      getJournalSnapshot(),
      getJournalSourceOptions(),
    ]);
  } catch (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Journal" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-danger"
              />
              <h1 className="mt-4 text-xl font-semibold">
                Journal is unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {error instanceof Error
                  ? error.message
                  : "The trade journal could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Journal" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
                <BookOpenText aria-hidden="true" className="size-3.5" />
                Decision-to-outcome record
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Preserve the decision, not just the result.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Record manual plans, counter-evidence, status changes, and
                reflections while Schwab connectivity is pending. Journal data
                is private and is not sent to AI.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 self-start sm:grid-cols-4 md:self-auto">
              {[
                ["All", snapshot.counts.all],
                ["Planned", snapshot.counts.planned],
                ["Open", snapshot.counts.open],
                ["Closed P/L", formatPnl(snapshot.realizedPnl)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-24 rounded-xl border border-border bg-card px-3 py-2.5 text-center"
                >
                  <p className="font-mono text-base font-semibold">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <div className="mb-6 rounded-xl border border-warning/20 bg-warning/[0.055] px-4 py-3 text-xs leading-5 text-[#e9d2a0]">
            Entry value uses a signed manual convention: debit paid is positive;
            credit received is negative. P/L is your recorded result—not a
            broker-reconciled or calculated value.
          </div>

          <JournalWorkspace
            sourceOptions={sourceOptions}
            trades={snapshot.trades}
          />
        </div>
      </main>
    </div>
  );
}
