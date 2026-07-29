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
  const ranked = candidates.filter(
    (
      candidate,
    ): candidate is EvidenceRankedCandidate & {
      latestEvidence: NonNullable<
        EvidenceRankedCandidate["latestEvidence"]
      >;
    } => candidate.latestEvidence !== null,
  );
  const topRanked = ranked.slice(0, 10);
  const awaitingData = candidates.filter(
    ({ latestEvidence }) => latestEvidence === null,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
            <h2 className="text-sm font-semibold capitalize">
              {direction} scanner ranking
            </h2>
            <p className="text-xs text-muted">
              Complete Setup Alignment observations only
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-muted">
          {ranked.length} ranked · {awaitingData.length} awaiting data
        </span>
      </div>

      {candidates.length ? (
        <>
          {ranked.length ? (
            <ol className="divide-y divide-border">
              {topRanked.map((candidate, index) => (
                <li
                  key={`${candidate.importBatchId}-${candidate.symbol}`}
                  className="px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-mono text-xs text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-sm font-semibold tracking-wide">
                      {candidate.symbol}
                    </span>
                    <span
                      className={`ml-auto font-mono text-sm font-semibold ${
                        bullish ? "text-accent" : "text-danger"
                      }`}
                    >
                      {candidate.latestEvidence.score}/100
                    </span>
                  </div>
                  <div
                    aria-label={`${candidate.symbol} Setup Alignment ${candidate.latestEvidence.score} out of 100`}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.055]"
                    role="img"
                  >
                    <div
                      className={`h-full rounded-full ${
                        bullish ? "bg-accent" : "bg-danger"
                      }`}
                      style={{
                        width: `${candidate.latestEvidence.score}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-[9px] text-muted sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Rule match · {candidate.latestEvidence.score / 10} of 10
                      guidelines
                    </span>
                    <span>
                      {candidate.latestEvidence.observationSource} ·{" "}
                      {formatTimestamp(
                        candidate.latestEvidence.observationTimestamp,
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="border-b border-border px-5 py-8">
              <Gauge
                aria-hidden="true"
                className={`size-5 ${bullish ? "text-accent" : "text-danger"}`}
              />
              <p className="mt-3 text-sm font-medium">
                No {direction} candidates are ranked yet.
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-muted">
                A complete, timestamped market observation is required before a
                candidate can enter this chart.
              </p>
            </div>
          )}

          {ranked.length > topRanked.length ? (
            <p className="border-t border-border px-5 py-3 text-[10px] text-muted">
              Showing the top {topRanked.length} of {ranked.length} complete{" "}
              {direction} observations.
            </p>
          ) : null}

          {awaitingData.length ? (
            <div className="bg-background/25 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                  Awaiting market data
                </p>
                <span className="font-mono text-[10px] text-muted">
                  {awaitingData.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {awaitingData.slice(0, 12).map((candidate) => (
                  <span
                    key={`${candidate.importBatchId}-${candidate.symbol}`}
                    className="rounded-md border border-border bg-white/[0.025] px-2.5 py-1.5 font-mono text-[10px] text-muted"
                  >
                    {candidate.symbol}
                  </span>
                ))}
                {awaitingData.length > 12 ? (
                  <span className="px-1 py-1.5 text-[10px] text-muted">
                    +{awaitingData.length - 12} more
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-[10px] leading-4 text-muted">
                These symbols are not ordered by quality and do not receive a
                placeholder score.
              </p>
            </div>
          ) : null}
        </>
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
  const latestObservation =
    rankedCandidates
      .flatMap(({ latestEvidence }) => (latestEvidence ? [latestEvidence] : []))
      .toSorted((left, right) =>
        right.observationTimestamp.localeCompare(left.observationTimestamp),
      )[0] ?? null;
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
              Scanner analysis · Schwab-ready
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Rank today&apos;s scanner candidates by evidence.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Current Thinkorswim symbols enter the chart only after all ten
              versioned guidelines have sourced observations. Setup Alignment
              is deterministic rule matching—not confidence, probability, or a
              recommendation.
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
                label: "Ranked coverage",
                value: `${assessedCount}/${physicalCount}`,
                detail: "Complete current observations",
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
                label: "Market data",
                value: latestObservation ? "Observed" : "Schwab pending",
                detail: latestObservation
                  ? `${latestObservation.observationSource} · ${formatTimestamp(latestObservation.observationTimestamp)}`
                  : "No complete live observation",
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
              <h2 className="text-sm font-semibold">
                {assessedCount
                  ? "Review the strongest rule matches"
                  : "Market evidence is still missing"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                {physicalCount - assessedCount} current candidate
                {physicalCount - assessedCount === 1 ? "" : "s"} remain outside
                the ranking until a complete observation is available. Schwab
                will automate this enrichment after its credentials are
                connected.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/evidence"
                className="inline-flex items-center gap-2 rounded-lg bg-[#9bbaff] px-3.5 py-2.5 text-xs font-semibold text-[#09111e] transition hover:bg-[#b7ccff]"
              >
                <Gauge aria-hidden="true" className="size-3.5" />
                Assess manually
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

          <div className="mt-4 rounded-xl border border-warning/20 bg-warning/[0.055] px-4 py-3 text-xs leading-5 text-[#e9d2a0]">
            Workbook position is never treated as rank. Candidates awaiting
            market data stay visible for coverage, but only complete current
            observations enter the charts below.
          </div>

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
