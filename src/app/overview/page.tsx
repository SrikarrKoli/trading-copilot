import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  Gauge,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-9 place-items-center rounded-lg ${
              bullish ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"
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
              Saved Setup Alignment first
            </p>
          </div>
        </div>
        <span className="font-mono text-sm text-muted">{candidates.length}</span>
      </div>

      {candidates.length ? (
        <ol className="divide-y divide-border">
          {candidates.slice(0, 10).map((candidate, index) => (
            <li
              key={`${candidate.importBatchId}-${candidate.symbol}`}
              className="flex items-center gap-4 px-5 py-3.5"
            >
              <span className="w-5 font-mono text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-sm font-semibold tracking-wide">
                {candidate.symbol}
              </span>
              <div className="ml-auto text-right">
                {candidate.latestEvidence ? (
                  <>
                    <p className="font-mono text-xs font-semibold text-[#b7ccff]">
                      {candidate.latestEvidence.score}/100
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted">
                      observed{" "}
                      {formatTimestamp(
                        candidate.latestEvidence.observationTimestamp,
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-medium text-warning">
                      Needs assessment
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted">
                      source row {candidate.sourceRow}
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
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

  let snapshot;
  let assessments;
  try {
    const [dashboardSnapshot, claims] = await Promise.all([
      getDashboardSnapshot(),
      getPermanentOwnerClaims(),
    ]);
    const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
    if (!ownerId) {
      throw new Error("The authenticated owner session is unavailable.");
    }

    const currentCandidates = [
      ...dashboardSnapshot.candidates.bullish,
      ...dashboardSnapshot.candidates.bearish,
    ];
    snapshot = dashboardSnapshot;
    assessments = await getLatestEvidenceAssessmentsForOwner(
      ownerId,
      currentCandidates,
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Overview" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
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
        <div className="mx-auto w-full max-w-[1500px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 border-b border-border pb-7">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent" />
              Supabase review state
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Your scanner workspace, at a glance.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Start with today&apos;s imported candidates, then assess evidence
              and record a deliberate review. Setup Alignment is deterministic
              rule matching—not confidence or a recommendation.
            </p>
          </header>

          <section
            aria-label="Review summary"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              {
                icon: Database,
                label: "Current candidates",
                value: physicalCount,
                detail: "Deduplicated valid symbols",
              },
              {
                icon: Gauge,
                label: "Evidence coverage",
                value: `${assessedCount}/${physicalCount}`,
                detail: "Complete saved assessments",
              },
              {
                icon: ListChecks,
                label: "Highest setup",
                value: highestScore === null ? "—" : `${highestScore}/100`,
                detail:
                  highestScore === null
                    ? "No complete assessment saved"
                    : "Rule alignment, not probability",
              },
              {
                icon: Clock3,
                label: "Observation time",
                value: latestImport?.marketDataTimestamp ? "Recorded" : "Missing",
                detail: latestImport?.marketDataTimestamp
                  ? formatTimestamp(latestImport.marketDataTimestamp)
                  : "Upload time is not market time",
              },
            ].map(({ detail, icon: Icon, label, value }) => (
              <article
                key={label}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">{label}</p>
                  <Icon aria-hidden="true" className="size-4 text-muted" />
                </div>
                <p className="mt-3 font-mono text-2xl font-medium">{value}</p>
                <p className="mt-2 text-xs text-muted">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#9bbaff]/20 bg-[#9bbaff]/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Continue today&apos;s review</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                {physicalCount - assessedCount} current candidate
                {physicalCount - assessedCount === 1 ? "" : "s"} still need a
                complete manual assessment.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/evidence"
                className="inline-flex items-center gap-2 rounded-lg bg-[#9bbaff] px-3.5 py-2.5 text-xs font-semibold text-[#09111e] transition hover:bg-[#b7ccff]"
              >
                <Gauge aria-hidden="true" className="size-3.5" />
                Assess evidence
              </Link>
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-xs font-medium text-foreground transition hover:bg-white/[0.04]"
              >
                <ListChecks aria-hidden="true" className="size-3.5" />
                Open review queue
              </Link>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <CandidateList
              candidates={rankedBullish}
              direction="bullish"
            />
            <CandidateList
              candidates={rankedBearish}
              direction="bearish"
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Recent imports</h2>
                <p className="mt-1 text-xs text-muted">
                  File identity, reconciliation, and freshness state
                </p>
              </div>
              <CheckCircle2 aria-hidden="true" className="size-4 text-accent" />
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
                        <td className="px-5 py-4 font-medium">{item.filename}</td>
                        <td className="px-5 py-4 capitalize text-muted">
                          {item.direction}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-accent/25 bg-accent/8 px-2.5 py-1 text-xs capitalize text-accent">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-muted">
                          {item.validRows} valid · {item.invalidRows} invalid ·{" "}
                          {item.duplicateRows} duplicate
                        </td>
                        <td className="px-5 py-4 text-xs text-muted">
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
