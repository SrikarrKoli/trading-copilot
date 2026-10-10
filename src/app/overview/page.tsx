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
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="ml-auto flex w-[120px] items-center justify-end gap-2">
      <div aria-hidden="true" className="h-1 w-[84px] overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-foreground/80" style={{ width: `${score}%` }} />
      </div>
      <span className="w-7 text-right font-mono text-[15px] font-medium tabular-nums tracking-tight text-foreground">
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
    <div className="grid gap-8 md:grid-cols-2">
      {[
        { key: "assessed", label: "Assessed", rows: assessed },
        { key: "pending", label: "Needs assessment", rows: pending },
      ].map(({ key, label, rows }) => (
        <div key={key} className="min-w-0">
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <h3 className="text-sm font-medium">{label} <span className="ml-2 font-mono text-xs text-muted">{rows.length}</span></h3>
            <span className="text-[11px] text-muted">Alignment /100</span>
          </div>
          <table className="candidate-blotter w-full table-fixed text-left">
            <caption className="sr-only">{label} candidates, ranked by Setup Alignment</caption>
            <colgroup><col /><col className="w-[132px]" /></colgroup>
            <thead className="sr-only"><tr><th scope="col">Symbol and direction</th><th scope="col">Alignment /100</th></tr></thead>
            <tbody>
              {rows.map((candidate, index) => (
                <tr key={`${candidate.importBatchId}-${candidate.direction}-${candidate.symbol}`} className="border-b border-white/[0.06] hover:bg-row-hover">
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-muted/60">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <Link href={`/reviews?symbol=${encodeURIComponent(candidate.symbol)}`} className="block text-[15px] font-semibold leading-[17px] tracking-tight underline-offset-4 hover:underline">{candidate.symbol}</Link>
                        <span className="block text-[10px] leading-[12px] text-muted">{candidate.direction === "bullish" ? "↑ Bull" : "↓ Bear"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right"><AlignmentCell score={candidate.latestEvidence?.score ?? null} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="py-6 text-xs text-muted">{key === "assessed" ? "No assessments yet." : "All current candidates assessed."}</p>}
        </div>
      ))}
    </div>
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
  const remaining = Math.max(physicalCount - assessedCount, 0);
  const stale = freshness.toLowerCase().startsWith("stale");

  return (
    <div className="overview-workspace min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Overview" />
      <main className="min-h-screen lg:pl-56">
        <div className="w-full p-4 sm:p-6">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Research overview</h1>
              <span aria-hidden="true" className="text-muted/40">·</span>
              <Link href="/imports" title={`Observation: ${formatTimestamp(latestImport?.marketDataTimestamp ?? null)}. Open imports.`} className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground">
                {stale && <AlertTriangle aria-hidden="true" className="size-3" />}
                {stale ? "Observation older than 24h" : freshness}
                <span aria-hidden="true">↗</span>
              </Link>
              {demo && <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted">Demo</span>}
            </div>
            <p className="mt-2 text-xs text-muted">Research only · Setup Alignment measures rule matching, not probability or a trade recommendation.</p>
          </header>

          <section aria-labelledby="candidates-heading" className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4">
              <div>
                <h2 id="candidates-heading" className="text-base font-semibold">Current candidates <span className="ml-2 font-mono text-sm font-normal text-muted">{physicalCount}</span></h2>
                <p className="mt-1 text-xs text-muted">Ranked by Setup Alignment · assessed first</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-28">
                  <p className="text-xs text-muted"><span className="font-mono tabular-nums text-foreground">{assessedCount}/{physicalCount}</span> assessed</p>
                  <div role="progressbar" aria-label="Candidate assessment progress" aria-valuemin={0} aria-valuemax={physicalCount || 1} aria-valuenow={assessedCount} className="mt-2 h-0.5 overflow-hidden bg-white/10">
                    <div className="h-full bg-foreground/60" style={{ width: `${physicalCount ? assessedCount / physicalCount * 100 : 0}%` }} />
                  </div>
                </div>
                <Link href={remaining > 0 ? "/evidence" : nextAction.href} className="inline-flex min-h-9 items-center rounded bg-accent px-3 text-xs font-semibold text-background hover:bg-accent-strong">{remaining > 0 ? `Assess ${remaining} remaining` : `${nextAction.label} →`}</Link>
              </div>
            </div>
            <CandidateTable candidates={rankedCandidates} />
          </section>

          <section className="mt-10 overflow-hidden border-t border-white/10 pt-3">
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
