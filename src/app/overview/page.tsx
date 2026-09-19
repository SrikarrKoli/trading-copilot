import { isDemoDatasetActive } from "@/lib/demo/dataset";
import { AlertTriangle, Gauge } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dashboardNextAction, observationFreshness } from "@/lib/dashboard/summary";
import { AppSidebar } from "@/components/app-sidebar";
import { getPermanentOwnerClaims, hasOwnerAccess } from "@/lib/auth/owner";
import { getDashboardSnapshot } from "@/lib/dashboard/data";
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

function AlignmentCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-[13px] text-muted">Not assessed</span>;
  }
  return (
    <div className="flex items-center justify-end gap-3">
      <div
        aria-hidden="true"
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div
          className="h-full rounded-full bg-foreground/75"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-sm tabular-nums text-foreground">
        {score}
      </span>
    </div>
  );
}

function CandidateTable({
  candidates,
}: {
  candidates: EvidenceRankedCandidate[];
}) {
  if (!candidates.length) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm">No current candidates.</p>
        <p className="mt-1 text-xs text-muted">
          Import a validated Thinkorswim workbook to populate this list.
        </p>
        <Link
          href="/imports"
          className="mt-4 inline-flex rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-background"
        >
          Open imports
        </Link>
      </div>
    );
  }

  const assessed = candidates.filter((c) => c.latestEvidence);
  const pending = candidates.filter((c) => !c.latestEvidence);

  return (
    <table className="overview-table w-full min-w-[500px] table-fixed text-left text-[13px]">
      <colgroup><col className="w-[120px]" /><col /><col className="w-[280px]" /></colgroup>
      <thead className="border-b border-white/[0.06] text-xs text-muted">
        <tr>
          <th scope="col" className="px-4 py-2 font-medium">
            Symbol
          </th>
          <th scope="col" className="px-4 py-2 font-medium">
            Direction
          </th>
          <th scope="col" className="px-4 py-2 text-right font-medium">
            Alignment /100
          </th>
        </tr>
      </thead>
      {[
        { key: "assessed", label: "Assessed", rows: assessed },
        { key: "pending", label: "Needs assessment", rows: pending },
      ].map(({ key, label, rows }) =>
        rows.length ? (
          <tbody key={key}>
            <tr>
              <th
                colSpan={3}
                scope="rowgroup"
                className="bg-white/[0.02] px-4 py-2 text-xs font-medium text-muted"
              >
                {label} · {rows.length}
              </th>
            </tr>
            {rows.map((candidate) => (
              <tr
                key={`${candidate.importBatchId}-${candidate.direction}-${candidate.symbol}`}
                className="h-[38px] border-t border-white/[0.04] hover:bg-row-hover"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/reviews?symbol=${encodeURIComponent(candidate.symbol)}`}
                    className="font-mono text-[16px] font-semibold tracking-tight underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {candidate.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-[13px] font-medium capitalize ${
                      candidate.direction === "bullish"
                        ? "text-positive"
                        : "text-danger"
                    }`}
                  >
                    {candidate.direction}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <AlignmentCell score={candidate.latestEvidence?.score ?? null} />
                </td>
              </tr>
            ))}
          </tbody>
        ) : null,
      )}
    </table>
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
        <main className="min-h-screen lg:pl-56">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div
              role="alert"
              className="rounded-lg border border-danger/25 bg-danger/8 p-6"
            >
              <AlertTriangle aria-hidden="true" className="size-5 text-danger" />
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
  const freshness = observationFreshness(
    latestImport?.marketDataTimestamp ?? null,
  );
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
  const rankedCandidates = [...rankedBullish, ...rankedBearish].sort((a, b) => {
    const aScore = a.latestEvidence?.score ?? -1;
    const bScore = b.latestEvidence?.score ?? -1;
    return bScore - aScore;
  });
  const assessedCount = rankedCandidates.filter(
    ({ latestEvidence }) => latestEvidence,
  ).length;
  const nextAction = dashboardNextAction(
    physicalCount,
    assessedCount,
    snapshot.reviewCounts.unreviewed,
  );
  const highestScore = rankedCandidates.reduce<number | null>((highest, candidate) => {
    const score = candidate.latestEvidence?.score;
    if (score === undefined) return highest;
    return highest === null ? score : Math.max(highest, score);
  }, null);
  const remaining = Math.max(physicalCount - assessedCount, 0);
  const stale = freshness.toLowerCase().startsWith("stale");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Overview" />
      <main className="min-h-screen lg:pl-56">
        <div className="mx-auto w-full max-w-[840px] px-5 py-5 sm:px-8 lg:py-6">
          <header className="mb-5 border-b border-white/[0.06] pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Research workspace{demo ? " · Demo dataset" : ""}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Research overview</h1>
              </div>
              <div className="text-[13px] sm:text-right">
                <p className="text-muted">Observation</p>
                <p className="mt-1">{formatTimestamp(latestImport?.marketDataTimestamp ?? null)}</p>
                {stale && <span className="mt-1 inline-block rounded border border-white/[0.06] px-1.5 py-0.5 text-[11px] text-muted">Stale observation</span>}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div className="w-full max-w-[360px]">
                <h2 className="flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-medium tracking-tight">{assessedCount} / {physicalCount}</span>
                  <span className="text-[15px] text-muted">assessed</span>
                </h2>
                <div role="progressbar" aria-label="Candidate assessment progress" aria-valuemin={0} aria-valuemax={physicalCount || 1} aria-valuenow={assessedCount} className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-foreground/80" style={{ width: `${physicalCount ? assessedCount / physicalCount * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Link href={nextAction.href} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-4 text-[13px] font-semibold text-background hover:bg-accent-strong">
                  <Gauge aria-hidden="true" className="size-4" />
                  {remaining > 0 ? `Assess ${remaining} remaining` : nextAction.label}
                </Link>
                <Link href="/reviews" className="text-[13px] text-muted hover:text-foreground">Review queue →</Link>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-muted">
              <p>Setup Alignment is rule matching—not probability or a trade recommendation.</p>
              <p>Top alignment <span className="font-mono text-foreground">{highestScore === null ? "—" : `${highestScore}/100`}</span></p>
            </div>
          </header>

          <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-[15px] font-semibold">Current candidates</h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  Ranked by Setup Alignment · assessed first
                </p>
              </div>
              <p className="font-mono text-[13px] text-muted">{physicalCount}</p>
            </div>
            <div className="overflow-x-auto"><CandidateTable candidates={rankedCandidates} /></div>
          </section>

          <section className="mt-5 overflow-hidden rounded-lg border border-white/[0.06] bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-[15px] font-semibold">Recent imports</h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  Latest scanner workbooks
                </p>
              </div>
              <Link
                href="/imports"
                className="text-xs text-muted hover:text-foreground"
              >
                View imports →
              </Link>
            </div>
            {snapshot.imports.length ? (
              <div className="overflow-x-auto">
                <table className="overview-table w-full min-w-[720px] whitespace-nowrap text-left text-[13px]">
                  <thead className="border-y border-white/[0.06] text-xs text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">File</th>
                      <th className="px-4 py-2 font-medium">Direction</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Rows</th>
                      <th className="px-4 py-2 font-medium">Imported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.imports.map((item) => (
                      <tr
                        key={item.id}
                        className="h-[38px] border-t border-white/[0.04] hover:bg-row-hover"
                      >
                        <td className="px-4 py-2 font-medium">
                          {item.filename}
                        </td>
                        <td className={`px-4 py-2 capitalize ${item.direction === "bullish" ? "text-positive" : "text-danger"}`}>
                          {item.direction}
                        </td>
                        <td className="px-4 py-2 text-[13px] capitalize text-muted">
                          {item.status}
                        </td>
                        <td className="px-4 py-2 font-mono text-[13px] text-muted">
                          {item.validRows} valid · {item.invalidRows} invalid ·{" "}
                          {item.duplicateRows} duplicate
                        </td>
                        <td className="px-4 py-2 text-[13px] text-muted">
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
