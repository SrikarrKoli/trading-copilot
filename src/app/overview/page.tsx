import { isDemoDatasetActive } from "@/lib/demo/dataset";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  Gauge,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dashboardNextAction, observationFreshness } from "@/lib/dashboard/summary";
import { AppSidebar } from "@/components/app-sidebar";
import { getPermanentOwnerClaims, hasOwnerAccess } from "@/lib/auth/owner";
import {
  type DashboardDirection,
  getDashboardSnapshot,
} from "@/lib/dashboard/data";
import {
  type EvidenceRankedCandidate,
  getLatestEvidenceAssessmentsForOwner,
  rankCurrentCandidatesByEvidence,
} from "@/lib/evidence/data";

function formatTimestamp(value: string | null): string {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CandidateList({
  candidates,
  direction,
}: {
  candidates: EvidenceRankedCandidate[];
  direction: DashboardDirection;
}) {
  const bullish = direction === "bullish";

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-9 place-items-center rounded-lg ${
              bullish ? "bg-positive/10 text-positive" : "bg-danger/10 text-danger"
            }`}
          >
            {bullish ? (
              <ArrowUpRight aria-hidden="true" className="size-4" />
            ) : (
              <ArrowDownRight aria-hidden="true" className="size-4" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold capitalize">{direction}</h2>
            <p className="text-xs text-muted">
              Ranked by setup alignment
            </p>
          </div>
        </div>
        <span className="font-mono text-sm text-muted">{candidates.length}</span>
      </div>

      {candidates.length ? (
        <table className="w-full text-left">
          <thead className="border-b border-border text-[11px] text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Symbol</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Alignment</th>
              <th scope="col" className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {candidates.slice(0, 10).map((candidate) => (
              <tr key={`${candidate.importBatchId}-${candidate.symbol}`} className="h-10 hover:bg-row-hover">
                <td className="px-4">
                  <Link href={`/reviews?symbol=${encodeURIComponent(candidate.symbol)}#candidate-${candidate.importBatchId}-${direction}-${candidate.symbol}`} className="font-mono text-base font-semibold underline-offset-4 hover:underline">
                    {candidate.symbol}
                  </Link>
                </td>
                <td className={`px-4 text-right font-mono text-sm ${candidate.latestEvidence ? (bullish ? "text-positive" : "text-danger") : "text-muted"}`}>
                  {candidate.latestEvidence ? <>{candidate.latestEvidence.score}<span className="text-xs text-muted"> /100</span></> : "—"}
                </td>
                <td className="px-4 text-xs text-muted">
                  {candidate.latestEvidence ? "Assessed" : <span className="text-foreground">Needs assessment</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-5 py-10 text-center">
          <FileSpreadsheet
            aria-hidden="true"
            className="mx-auto size-5 text-muted"
          />
          <p className="mt-3 text-sm">No current {direction} candidates.</p>
          <p className="mt-1 text-xs text-muted">
            Import a validated Thinkorswim workbook to populate this list.
          </p>
        </div>
      )}
    </section>
  );
}

export default async function OverviewPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  const demo = await isDemoDatasetActive();
  let snapshot;
  let assessments;
  try {
    const [dashboardSnapshot, claims] = await Promise.all([
      getDashboardSnapshot(),
      getPermanentOwnerClaims(),
    ]);
    const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
    if (!ownerId && !demo) {
      throw new Error("The authenticated owner session is unavailable.");
    }

    const currentCandidates = [
      ...dashboardSnapshot.candidates.bullish,
      ...dashboardSnapshot.candidates.bearish,
    ];
    snapshot = dashboardSnapshot;
    assessments = await getLatestEvidenceAssessmentsForOwner(
      ownerId ?? "demo",
      currentCandidates,
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Overview" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div role="alert" className="rounded-lg border border-danger/25 bg-danger/8 p-6">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-danger"
              />
              <h1 className="mt-4 text-xl font-semibold">
                Dashboard data is unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {error instanceof Error
                  ? error.message
                  : "The current review lists could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const latestImport = snapshot.imports[0] ?? null;
  const physicalCount =
    snapshot.candidates.bullish.length + snapshot.candidates.bearish.length;
  const rankedBullish = rankCurrentCandidatesByEvidence(
    snapshot.candidates.bullish,
    assessments,
  );
  const rankedBearish = rankCurrentCandidatesByEvidence(
    snapshot.candidates.bearish,
    assessments,
  );
  const rankedCandidates = [...rankedBullish, ...rankedBearish];
  const assessedCount = rankedCandidates.filter(
    ({ latestEvidence }) => latestEvidence,
  ).length;
  const nextAction = dashboardNextAction(physicalCount, assessedCount, snapshot.reviewCounts.unreviewed);
  const highestScore = rankedCandidates.reduce<number | null>(
    (highest, candidate) => {
      const score = candidate.latestEvidence?.score;
      if (score === undefined) return highest;
      return highest === null ? score : Math.max(highest, score);
    },
    null,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Overview" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-5 sm:px-8 lg:px-8 lg:py-6">
          <header className="pb-5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Workspace / Overview</p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em]">Research overview</h1>
            <p className="mt-2 text-xs leading-5 text-muted">Research only. Setup Alignment measures rule matching, not probability.</p>
          </header>

          <section aria-label="Workspace summary" className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border py-3 text-xs">
            {[
              ["Candidates", physicalCount],
              ["Assessed", `${assessedCount}/${physicalCount}`],
              ["Top alignment", highestScore === null ? "—" : `${highestScore}/100`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2"><span className="text-muted">{label}</span><span className="font-mono text-sm font-medium">{value}</span></div>
            ))}
            <Link href="/reviews" className="text-muted hover:text-foreground">Unreviewed <span className="ml-1 font-mono text-foreground">{snapshot.reviewCounts.unreviewed}</span></Link>
            <Link href="/watchlists" className="text-muted hover:text-foreground">Watchlists <span className="ml-1 font-mono text-foreground">{snapshot.activeWatchlistCount}</span></Link>
            <Link href="/journal" className="text-muted hover:text-foreground">Journal <span className="ml-1 font-mono text-foreground">{snapshot.journalTradeCount}</span></Link>
          </section>

          <section aria-label="Next action" className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-xs text-muted">{physicalCount ? `${physicalCount - assessedCount} candidates need assessment` : "Import a scanner workbook to begin."}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={nextAction.href} className="inline-flex items-center gap-2 rounded-md bg-accent px-3.5 py-2.5 text-xs font-semibold text-background hover:bg-accent-strong">
                <Gauge aria-hidden="true" className="size-3.5" />{nextAction.label}
              </Link>
              <Link href={nextAction.href === "/reviews" ? "/evidence" : "/reviews"} className="inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2.5 text-xs font-medium hover:bg-card">
                <ListChecks aria-hidden="true" className="size-3.5" />{nextAction.href === "/reviews" ? "Open evidence" : "Open review queue"}
              </Link>
            </div>
          </section>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Current candidates</h2>
            <p className="flex items-center gap-2 text-[11px] text-warning">
              <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
              {observationFreshness(latestImport?.marketDataTimestamp ?? null)}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CandidateList
              candidates={rankedBullish}
              direction="bullish"
            />
            <CandidateList
              candidates={rankedBearish}
              direction="bearish"
            />
          </div>

          <section className="mt-7 overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Recent imports</h2>
                <p className="mt-1 text-xs text-muted">
                  Latest scanner workbooks
                </p>
              </div>
              <Link href="/imports" className="text-xs text-muted hover:text-foreground">View imports →</Link>
            </div>
            {snapshot.imports.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border bg-background/45 text-xs text-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">File</th>
                      <th className="px-5 py-3 font-medium">Direction</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Rows</th>
                      <th className="px-5 py-3 font-medium">Imported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {snapshot.imports.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">{item.filename}</td>
                        <td className="px-4 py-3 capitalize text-muted">
                          {item.direction}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs capitalize text-muted">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">
                          {item.validRows} valid · {item.invalidRows} invalid ·{" "}
                          {item.duplicateRows} duplicate
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {formatTimestamp(item.completedAt ?? item.uploadedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted">
                No imports have been committed yet.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
