import { isDemoDatasetActive } from "@/lib/demo/dataset";
import { AlertTriangle } from "lucide-react";
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
        className="hidden h-1 w-24 shrink-0 sm:block overflow-hidden rounded-full bg-white/[0.06]"
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
          className="mt-4 inline-flex rounded-md bg-foreground px-3.5 py-2 text-xs font-semibold text-background"
        >
          Open imports
        </Link>
      </div>
    );
  }

  const assessed = candidates.filter((c) => c.latestEvidence);
  const pending = candidates.filter((c) => !c.latestEvidence);

  return (
    <table className="overview-table w-full min-w-[340px] table-fixed text-left text-[13px]">
      <colgroup><col className="w-[36%]" /><col /><col className="w-[128px] sm:w-[180px]" /></colgroup>
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
                    className="block font-mono text-sm font-semibold leading-4 tracking-tight underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {candidate.symbol}
                  </Link>
                  <p className="text-xs leading-4 text-muted">Import · row {candidate.sourceRow}</p>
                </td>
                <td className="px-4 py-2">
                  <span
                    className="inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs font-medium capitalize text-foreground/80"
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
      <div className="overview-workspace min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Overview" />
        <main className="min-h-screen lg:pl-56">
          <div className="p-4 sm:p-6">
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
  const topCandidate = rankedCandidates.find((candidate) => candidate.latestEvidence);
  const highestScore = topCandidate?.latestEvidence?.score ?? null;
  const remaining = Math.max(physicalCount - assessedCount, 0);
  const stale = freshness.toLowerCase().startsWith("stale");

  return (
    <div className="overview-workspace min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Overview" />
      <main className="min-h-screen lg:pl-56">
        <div className="w-full p-4 sm:p-6">
          <header className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">Research overview</h1>
            <p className="mt-1 text-sm text-muted">
              Options research · imported candidates ranked by Setup Alignment{demo ? " · Demo dataset" : ""}
            </p>
          </header>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-labelledby="candidates-heading" className="min-w-0 overflow-hidden rounded-lg border border-white/[0.06] bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 id="candidates-heading" className="text-[15px] font-semibold">Current candidates</h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  Ranked by Setup Alignment · assessed first
                </p>
              </div>
              <p className="font-mono text-[13px] text-muted">{physicalCount}</p>
            </div>
            <div className="overflow-x-auto"><CandidateTable candidates={rankedCandidates} /></div>
          </section>

          <aside aria-label="Research insights" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <section className="rounded-lg border border-white/[0.06] bg-card p-4">
              <h2 className="text-sm font-medium">Assessment progress</h2>
              <p className="mt-3 font-mono text-2xl tabular-nums">
                {assessedCount}<span className="text-base text-muted"> / {physicalCount} assessed</span>
              </p>
              <div role="progressbar" aria-label="Candidate assessment progress" aria-valuemin={0} aria-valuemax={physicalCount || 1} aria-valuenow={assessedCount} className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-foreground/65" style={{ width: `${physicalCount ? assessedCount / physicalCount * 100 : 0}%` }} />
              </div>
              <Link href={nextAction.href} className="mt-4 flex min-h-10 items-center justify-center rounded-lg bg-foreground px-3 text-[13px] font-semibold text-background hover:bg-foreground/85">
                {remaining > 0 ? `Assess ${remaining} remaining` : nextAction.label}
              </Link>
            </section>

            <section className={`rounded-lg border p-4 ${stale ? "border-[#b8ac7d]/20 bg-[#b8ac7d]/[0.07]" : "border-white/[0.06] bg-card"}`}>
              <h2 className="text-sm font-medium">Observation freshness</h2>
              <p className={`mt-3 text-sm font-medium ${stale ? "text-[#d0c399]" : "text-foreground"}`}>
                {stale && <AlertTriangle aria-hidden="true" className="mr-1.5 inline-block size-4" />}
                {stale ? "Stale observation" : "Within 24 hours"}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-muted">{formatTimestamp(latestImport?.marketDataTimestamp ?? null)}</p>
              <p className="mt-2 text-[13px] leading-5 text-muted">
                {stale ? freshness.replace(/^Stale · /, "") + ". Import a current workbook before continuing research." : "Latest import observation is current within the 24-hour window."}
              </p>
              <Link href="/imports" className="mt-3 inline-block text-[13px] underline-offset-4 hover:underline">View imports →</Link>
            </section>

            <section className="rounded-lg border border-white/[0.06] bg-card p-4">
              <h2 className="text-sm font-medium">Top alignment</h2>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="font-mono text-lg font-medium">{topCandidate?.symbol ?? "—"}</p>
                <p className="font-mono text-2xl tabular-nums">{highestScore ?? "—"}<span className="text-sm text-muted"> /100</span></p>
              </div>
              {topCandidate ? (
                <>
                  <p className="mt-1 text-[13px] text-muted"><span className="capitalize">{topCandidate.direction}</span> · highest assessed rule match</p>
                  <Link href={`/reviews?symbol=${encodeURIComponent(topCandidate.symbol)}`} className="mt-3 inline-block text-[13px] underline-offset-4 hover:underline">Review candidate →</Link>
                </>
              ) : <p className="mt-2 text-[13px] text-muted">Assess a candidate to see its alignment.</p>}
            </section>

            <section className="rounded-lg border border-white/[0.06] bg-card p-4">
              <h2 className="text-sm font-medium">Research note</h2>
              <p className="mt-2 text-[13px] leading-5 text-muted">Setup Alignment measures rule matching, not probability or a trade recommendation.</p>
            </section>
          </aside>
          </div>

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
                        <td className="px-4 py-2 capitalize text-muted">
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
