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
    return <span className="font-mono text-sm text-muted">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-3">
      <div
        aria-hidden="true"
        className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div
          className="h-full rounded-full bg-accent"
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
    <table className="w-full text-left">
      <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.08em] text-muted">
        <tr>
          <th scope="col" className="px-4 py-2.5 font-medium">
            #
          </th>
          <th scope="col" className="px-4 py-2.5 font-medium">
            Symbol
          </th>
          <th scope="col" className="px-4 py-2.5 font-medium">
            Direction
          </th>
          <th scope="col" className="px-4 py-2.5 text-right font-medium">
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
                colSpan={4}
                scope="rowgroup"
                className="bg-white/[0.02] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted"
              >
                {label} · {rows.length}
              </th>
            </tr>
            {rows.map((candidate, index) => (
              <tr
                key={`${candidate.importBatchId}-${candidate.direction}-${candidate.symbol}`}
                className="border-t border-white/[0.04] hover:bg-row-hover"
              >
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/reviews?symbol=${encodeURIComponent(candidate.symbol)}`}
                    className="font-mono text-sm font-semibold tracking-tight underline-offset-4 hover:text-accent hover:underline"
                  >
                    {candidate.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-xs font-medium capitalize ${
                      candidate.direction === "bullish"
                        ? "text-positive"
                        : "text-danger"
                    }`}
                  >
                    {candidate.direction}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
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
        <div className="mx-auto w-full max-w-[1280px] px-5 py-5 sm:px-8 lg:py-6">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.06] pb-5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Workspace
                {demo ? " · Demo dataset" : ""}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                Research overview
              </h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
                Setup Alignment is rule matching—not probability or a trade recommendation.
              </p>
              <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <dt className="text-[11px] text-muted">Candidates</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-medium tabular-nums">
                    {physicalCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Assessed</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-medium tabular-nums">
                    {assessedCount}
                    <span className="text-sm text-muted">/{physicalCount}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Top alignment</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-medium tabular-nums">
                    {highestScore === null ? "—" : highestScore}
                    {highestScore !== null && (
                      <span className="text-sm font-normal text-muted">/100</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div
                className={`rounded-md px-3 py-2 text-[11px] ${
                  stale
                    ? "bg-warning/10 text-warning"
                    : "bg-white/[0.03] text-muted"
                }`}
              >
                <span className="font-medium">
                  {stale ? "Stale observation" : "Observation"}
                </span>
                <span className="ml-2 text-muted">
                  {formatTimestamp(latestImport?.marketDataTimestamp ?? null)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/reviews"
                  className="text-xs text-muted hover:text-foreground"
                >
                  Review queue →
                </Link>
                <Link
                  href={nextAction.href}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-3.5 text-xs font-semibold text-background hover:bg-accent-strong"
                >
                  <Gauge aria-hidden="true" className="size-3.5" />
                  {remaining > 0
                    ? `Assess ${remaining} remaining`
                    : nextAction.label}
                </Link>
              </div>
            </div>
          </header>

          <section className="overflow-hidden rounded-lg bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Current candidates</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Ranked by Setup Alignment · assessed first
                </p>
              </div>
              <p className="font-mono text-xs text-muted">{physicalCount}</p>
            </div>
            <CandidateTable candidates={rankedCandidates} />
          </section>

          <section className="mt-5 overflow-hidden rounded-lg bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Recent imports</h2>
                <p className="mt-0.5 text-[11px] text-muted">
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
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-y border-white/[0.06] text-[11px] uppercase tracking-[0.08em] text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">File</th>
                      <th className="px-4 py-2.5 font-medium">Direction</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Rows</th>
                      <th className="px-4 py-2.5 font-medium">Imported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.imports.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-white/[0.04] hover:bg-row-hover"
                      >
                        <td className="px-4 py-2.5 font-medium">
                          {item.filename}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-muted">
                          {item.direction}
                        </td>
                        <td className="px-4 py-2.5 text-xs capitalize text-muted">
                          {item.status}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted">
                          {item.validRows} valid · {item.invalidRows} invalid ·{" "}
                          {item.duplicateRows} duplicate
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted">
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
