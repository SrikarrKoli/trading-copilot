import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  Gauge,
  ListChecks,
  Radar,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SignalActionLink } from "@/components/ui/button";
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
    <section className="scroll-reveal overflow-hidden rounded-lg border border-white/[0.09] bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.065] px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3.5">
          <span
            className={`grid size-10 place-items-center rounded-2xl border ${
              bullish
                ? "border-positive/20 bg-positive/[0.07] text-positive"
                : "border-danger/15 bg-danger/[0.075] text-danger"
            }`}
          >
            {bullish ? (
              <ArrowUpRight aria-hidden="true" className="size-[18px]" />
            ) : (
              <ArrowDownRight aria-hidden="true" className="size-[18px]" />
            )}
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.015em]">
              {bullish ? "Bullish setups" : "Bearish setups"}
            </h2>
            <p className="mt-1 text-[10px] text-muted">
              Complete Setup Alignment observations
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`font-mono text-lg font-medium ${
              bullish ? "text-positive" : "text-danger"
            }`}
          >
            {ranked.length}
          </p>
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted">
            ranked
          </p>
        </div>
      </div>

      {candidates.length ? (
        <>
          {ranked.length ? (
            <ol>
              {topRanked.map((candidate, index) => (
                <li
                  key={`${candidate.importBatchId}-${candidate.symbol}`}
                  className="interactive-row border-b border-white/[0.055] px-5 py-4 last:border-b-0 sm:px-6"
                >
                  <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3">
                    <span
                      className={`grid size-8 place-items-center rounded-xl font-mono text-[10px] ${
                        index === 0
                          ? bullish
                            ? "bg-positive text-[#07150f]"
                            : "bg-danger text-[#1c0908]"
                          : "border border-white/[0.075] bg-white/[0.025] text-muted"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold tracking-[0.04em]">
                          {candidate.symbol}
                        </span>
                        {index === 0 ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] ${
                              bullish
                                ? "bg-positive/10 text-positive"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            Top match
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          aria-label={`${candidate.symbol} Setup Alignment ${candidate.latestEvidence.score} out of 100`}
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
                          role="img"
                        >
                          <div
                            className={`h-full rounded-full ${
                              bullish ? "bg-positive" : "bg-danger"
                            }`}
                            style={{
                              width: `${candidate.latestEvidence.score}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[9px] text-muted">
                          {candidate.latestEvidence.score / 10}/10
                        </span>
                      </div>
                    </div>
                    <div className="pl-2 text-right">
                      <span
                        className={`font-mono text-base font-semibold ${
                          bullish ? "text-positive" : "text-danger"
                        }`}
                      >
                        {candidate.latestEvidence.score}
                      </span>
                      <span className="font-mono text-[9px] text-muted">
                        /100
                      </span>
                      <p className="mt-1 max-w-24 truncate text-[8px] text-muted">
                        {candidate.latestEvidence.observationSource}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-5 py-9 sm:px-6">
              <Radar
                aria-hidden="true"
                className={`size-5 ${bullish ? "text-positive" : "text-danger"}`}
              />
              <p className="mt-4 text-sm font-medium">
                No {direction} setup is ranked yet.
              </p>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-muted">
                Complete, timestamped observations are required before a symbol
                can receive a Setup Alignment position.
              </p>
              <Link
                href="/evidence"
                className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-foreground transition hover:text-accent"
              >
                Add market evidence
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          )}

          {ranked.length > topRanked.length ? (
            <p className="border-t border-white/[0.055] px-6 py-3 text-[9px] text-muted">
              Showing the top {topRanked.length} of {ranked.length} complete{" "}
              {direction} observations.
            </p>
          ) : null}

          {awaitingData.length ? (
            <div className="border-t border-white/[0.055] bg-black/10 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-warning">
                  Awaiting evidence
                </p>
                <span className="font-mono text-[9px] text-muted">
                  {awaitingData.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {awaitingData.slice(0, 12).map((candidate) => (
                  <span
                    key={`${candidate.importBatchId}-${candidate.symbol}`}
                    className="rounded-lg border border-white/[0.065] bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-muted"
                  >
                    {candidate.symbol}
                  </span>
                ))}
                {awaitingData.length > 12 ? (
                  <span className="px-1.5 py-1 text-[9px] text-muted">
                    +{awaitingData.length - 12}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="px-5 py-12 text-center">
          <FileSpreadsheet
            aria-hidden="true"
            className="mx-auto size-5 text-muted"
          />
          <p className="mt-3 text-sm">No current {direction} candidates.</p>
          <p className="mt-1 text-xs text-muted">
            Import today&apos;s Thinkorswim workbook to begin.
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
      <AppShell activeItem="Scanner">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="rounded-[26px] border border-danger/20 bg-danger/[0.055] p-6">
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
      </AppShell>
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
  const coveragePercent =
    physicalCount === 0 ? 0 : Math.round((assessedCount / physicalCount) * 100);
  const latestImport = snapshot.imports[0] ?? null;

  const metrics = [
    {
      icon: Database,
      label: "Candidates",
      value: physicalCount,
      detail: "Valid symbols today",
    },
    {
      icon: Gauge,
      label: "Ranked coverage",
      value: `${assessedCount}/${physicalCount}`,
      detail: `${coveragePercent}% complete`,
    },
    {
      icon: ListChecks,
      label: "Leading setup",
      value: highestScore === null ? "—" : `${highestScore}`,
      detail:
        highestScore === null ? "Awaiting evidence" : "Setup Alignment / 100",
    },
    {
      icon: Clock3,
      label: "Observation state",
      value: latestObservation ? "Observed" : "Manual",
      detail: latestObservation
        ? formatTimestamp(latestObservation.observationTimestamp)
        : "Schwab connection pending",
    },
  ];

  return (
    <AppShell activeItem="Scanner">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-4 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <section className="hero-surface ui-enter overflow-hidden rounded-lg border border-white/[0.1] px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
            <div className="grid gap-9 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 border border-accent/20 bg-accent/[0.055] px-3 py-1.5 text-[10px] font-medium text-accent">
                    <span className="size-1.5 bg-accent" />
                    Scanner / Today
                  </span>
                </div>
                <h1 className="font-display max-w-4xl text-[clamp(2.7rem,5.7vw,5rem)] leading-[0.9] tracking-[-0.045em]">
                  Today&apos;s scanner
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-[#a4aea8] sm:text-[15px]">
                  Today&apos;s current candidates and Setup Alignment status.
                  Setup Alignment is rule matching, not probability or a trade
                  recommendation.
                </p>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  <SignalActionLink href="/evidence">
                    Assess candidates
                  </SignalActionLink>
                  <Link
                    href="/reviews"
                    className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.03] px-4 py-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.07]"
                  >
                    Open review queue
                  </Link>
                </div>
              </div>

              <div className="hidden rounded-lg border border-white/[0.1] bg-[#101312] p-6 xl:block">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                      Ranked coverage
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {assessedCount} of {physicalCount} candidates
                    </p>
                  </div>
                  <div
                    aria-label={`${coveragePercent}% of current candidates ranked`}
                    className="grid size-20 place-items-center rounded-full"
                    role="img"
                    style={{
                      background: `conic-gradient(var(--accent) ${coveragePercent}%, rgba(255,255,255,0.07) 0)`,
                    }}
                  >
                    <div className="grid size-[66px] place-items-center rounded-full bg-[#101312]">
                      <span className="font-mono text-lg font-semibold">
                        {coveragePercent}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                    <p className="text-[9px] text-muted">Bullish</p>
                    <p className="mt-1 font-mono text-base font-medium text-positive">
                      {snapshot.candidates.bullish.length}
                    </p>
                  </div>
                  <div className="border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                    <p className="text-[9px] text-muted">Bearish</p>
                    <p className="mt-1 font-mono text-base font-medium text-danger">
                      {snapshot.candidates.bearish.length}
                    </p>
                  </div>
                </div>
                <p className="mt-4 border-t border-white/[0.065] pt-4 text-[9px] leading-4 text-muted">
                  Latest import:{" "}
                  {latestImport
                    ? formatTimestamp(
                        latestImport.completedAt ?? latestImport.uploadedAt,
                      )
                    : "No committed import"}
                </p>
              </div>
            </div>
          </section>

          <section
            aria-label="Scanner summary"
            className="ui-enter ui-enter-delay-1 mt-4 grid overflow-hidden rounded-lg border border-white/[0.09] bg-card sm:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map(({ detail, icon: Icon, label, value }, index) => (
              <article
                key={label}
                className={`px-5 py-5 sm:px-6 ${
                  index > 0 ? "border-t border-white/[0.055] sm:border-t-0" : ""
                } ${index > 1 ? "sm:border-t xl:border-t-0" : ""} ${
                  index % 2 === 1 ? "sm:border-l" : ""
                } ${index > 1 ? "xl:border-l" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.13em] text-muted">
                    {label}
                  </p>
                  <Icon aria-hidden="true" className="size-3.5 text-muted" />
                </div>
                <p className="mt-3 font-mono text-2xl font-medium tracking-[-0.04em]">
                  {value}
                </p>
                <p className="mt-1.5 truncate text-[10px] text-muted">
                  {detail}
                </p>
              </article>
            ))}
          </section>

          <div className="ui-enter ui-enter-delay-2 mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
                Analysis / Setup Alignment
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
                Current ranking
              </h2>
            </div>
            <p className="max-w-lg text-xs leading-5 text-muted sm:text-right">
              Workbook order is ignored. Symbols without complete current
              evidence remain visible but never receive placeholder scores.
            </p>
          </div>

          <div className="ui-enter ui-enter-delay-2 mt-5 grid gap-5 xl:grid-cols-2">
            <CandidateList
              candidates={rankedBullish}
              direction="bullish"
            />
            <CandidateList
              candidates={rankedBearish}
              direction="bearish"
            />
          </div>

          <section className="scroll-reveal mt-8 overflow-hidden rounded-lg border border-white/[0.09] bg-card">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
                  Data provenance
                </p>
                <h2 className="mt-1.5 text-sm font-semibold">Recent imports</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-accent">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Reconciled scanner files
              </div>
            </div>
            {snapshot.imports.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-white/[0.055] bg-black/10 text-[9px] uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="px-6 py-3.5 font-medium">File</th>
                      <th className="px-6 py-3.5 font-medium">Direction</th>
                      <th className="px-6 py-3.5 font-medium">Status</th>
                      <th className="px-6 py-3.5 font-medium">Rows</th>
                      <th className="px-6 py-3.5 font-medium">Imported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.imports.map((item) => (
                      <tr
                        key={item.id}
                        className="interactive-row border-b border-white/[0.05] last:border-b-0"
                      >
                        <td className="px-6 py-4 text-xs font-medium">
                          {item.filename}
                        </td>
                        <td className="px-6 py-4 text-[10px] capitalize text-muted">
                          {item.direction}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full border border-accent/15 bg-accent/[0.065] px-2.5 py-1 text-[9px] capitalize text-accent">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[9px] text-muted">
                          {item.validRows} valid · {item.invalidRows} invalid ·{" "}
                          {item.duplicateRows} duplicate
                        </td>
                        <td className="px-6 py-4 text-[9px] text-muted">
                          {formatTimestamp(item.completedAt ?? item.uploadedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-12 text-center text-xs text-muted">
                No imports for today.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
