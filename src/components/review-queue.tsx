"use client";

import {
  Bookmark,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  Gauge,
  LoaderCircle,
  Scale,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { recordReviewAction } from "@/app/reviews/actions";
import { strategyLabSourceHref } from "@/lib/options/source-request";
import {
  INITIAL_REVIEW_ACTION_STATE,
  REVIEW_REASONS,
  type ReviewAction,
  type ReviewQueueCandidate,
} from "@/lib/review/types";
import type { WatchlistOption } from "@/lib/watchlist/types";

const ACTION_STYLES: Record<ReviewAction, string> = {
  saved: "border-accent/30 text-accent hover:bg-accent/10",
  dismissed: "border-danger/30 text-danger hover:bg-danger/10",
  deferred: "border-warning/30 text-warning hover:bg-warning/10",
  watchlisted: "border-[#7aa7ff]/30 text-[#9bbaff] hover:bg-[#7aa7ff]/10",
};

const ACTION_ICONS = {
  saved: Check,
  dismissed: X,
  deferred: Clock3,
  watchlisted: Bookmark,
} as const;

function statusLabel(candidate: ReviewQueueCandidate): string {
  return candidate.latestAction?.action ?? "open";
}

function ReviewCard({
  candidate,
  defaultOpen,
  watchlists,
}: {
  candidate: ReviewQueueCandidate;
  defaultOpen: boolean;
  watchlists: WatchlistOption[];
}) {
  const [state, action, pending] = useActionState(
    recordReviewAction,
    INITIAL_REVIEW_ACTION_STATE,
  );
  const currentStatus = statusLabel(candidate);
  const defaultWatchlistId =
    watchlists.find(({ direction }) => direction === candidate.direction)?.id ??
    watchlists.find(({ direction }) => direction === "research")?.id ??
    watchlists[0]?.id ??
    "";

  return (
    <article className="scroll-reveal deferred-card overflow-hidden rounded-[24px] border border-white/[0.075] bg-card/90 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={`mt-0.5 size-2 rounded-full ${
              candidate.direction === "bullish" ? "bg-accent" : "bg-danger"
            }`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-mono text-lg font-semibold tracking-wide">
                {candidate.symbol}
              </h2>
              <span className="rounded-full border border-white/[0.075] bg-black/15 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                {candidate.direction}
              </span>
              <span className="rounded-full border border-white/[0.075] bg-white/[0.03] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-foreground">
                {currentStatus}
              </span>
              {candidate.latestEvidence ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info/[0.065] px-2.5 py-1 font-mono text-[9px] font-semibold text-[#c6cff2]">
                  <Gauge aria-hidden="true" className="size-3" />
                  Setup {candidate.latestEvidence.score}/100
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted">
              Import {candidate.importBatchId.slice(0, 8)} · source row{" "}
              {candidate.sourceRow}
            </p>
            {candidate.latestEvidence ? (
              <p className="mt-1 text-[10px] leading-4 text-muted">
                Evidence observed{" "}
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(
                  new Date(candidate.latestEvidence.observationTimestamp),
                )}{" "}
                · {candidate.latestEvidence.observationSource}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex max-w-sm flex-col items-start gap-3 sm:items-end">
          {candidate.latestAction ? (
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted">
                Latest reason:{" "}
                <span className="text-foreground">
                  {REVIEW_REASONS.find(
                    ({ value }) =>
                      value === candidate.latestAction?.reasonCode,
                  )?.label ?? candidate.latestAction.reasonCode}
                </span>
              </p>
              {candidate.latestAction.note ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {candidate.latestAction.note}
                </p>
              ) : null}
            </div>
          ) : null}
          <Link
            href={strategyLabSourceHref({
              direction: candidate.direction,
              importBatchId: candidate.importBatchId,
              kind: "review",
              symbol: candidate.symbol,
            })}
            className="inline-flex items-center gap-2 rounded-xl border border-info/20 bg-info/[0.055] px-3 py-2 text-xs font-medium text-[#c6cff2] transition hover:-translate-y-0.5 hover:bg-info/10"
          >
            <Scale aria-hidden="true" className="size-3.5" />
            Build strategy
          </Link>
        </div>
      </div>

      <details
        className="group border-t border-white/[0.06]"
        open={defaultOpen}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-xs font-medium text-muted transition hover:bg-white/[0.025] hover:text-foreground sm:px-6">
          <span>Record or update decision</span>
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 transition-transform group-open:rotate-180"
          />
        </summary>
        <form action={action} className="border-t border-white/[0.055] p-5 sm:p-6">
          <input
            type="hidden"
            name="importBatchId"
            value={candidate.importBatchId}
          />
          <input type="hidden" name="direction" value={candidate.direction} />
          <input type="hidden" name="symbol" value={candidate.symbol} />

          <fieldset disabled={pending} className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor={`reason-${candidate.importBatchId}-${candidate.symbol}`}
              className="mb-2 block text-xs font-medium text-muted"
            >
              Reason code
            </label>
            <select
              id={`reason-${candidate.importBatchId}-${candidate.symbol}`}
              name="reasonCode"
              required
              defaultValue=""
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm text-foreground"
            >
              <option value="" disabled>
                Choose a reason
              </option>
              {REVIEW_REASONS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={`note-${candidate.importBatchId}-${candidate.symbol}`}
              className="mb-2 block text-xs font-medium text-muted"
            >
              Optional note
            </label>
            <textarea
              id={`note-${candidate.importBatchId}-${candidate.symbol}`}
              name="note"
              rows={2}
              maxLength={2000}
              placeholder="What evidence or constraint drove this decision?"
              className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm text-foreground placeholder:text-muted/60"
            />
          </div>
          <div>
            <label
              htmlFor={`watchlist-${candidate.importBatchId}-${candidate.symbol}`}
              className="mb-2 block text-xs font-medium text-muted"
            >
              Watchlist target
            </label>
            <select
              id={`watchlist-${candidate.importBatchId}-${candidate.symbol}`}
              name="watchlistId"
              defaultValue={defaultWatchlistId}
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm text-foreground"
            >
              {watchlists.length ? (
                watchlists.map((watchlist) => (
                  <option key={watchlist.id} value={watchlist.id}>
                    {watchlist.name} · {watchlist.direction}
                  </option>
                ))
              ) : (
                <option value="">Create a watchlist first</option>
              )}
            </select>
          </div>

            <div className="flex flex-wrap gap-2 lg:col-span-3">
              {(["saved", "dismissed", "deferred", "watchlisted"] as const).map(
                (reviewAction) => {
                  const Icon = ACTION_ICONS[reviewAction];
                  return (
                    <button
                      key={reviewAction}
                      type="submit"
                      name="action"
                      value={reviewAction}
                      disabled={
                        pending ||
                        (reviewAction === "watchlisted" && !watchlists.length)
                      }
                      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium capitalize transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50 ${ACTION_STYLES[reviewAction]}`}
                    >
                      {pending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-3.5 animate-spin"
                        />
                      ) : (
                        <Icon aria-hidden="true" className="size-3.5" />
                      )}
                      {reviewAction}
                    </button>
                  );
                },
              )}
            </div>
          </fieldset>

          {state.message ? (
            <p
              aria-live="polite"
              className={`mt-4 text-xs ${
                state.status === "success" ? "text-accent" : "text-danger"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </details>
    </article>
  );
}

export function ReviewQueue({
  candidates,
  watchlists,
}: {
  candidates: ReviewQueueCandidate[];
  watchlists: WatchlistOption[];
}) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<
    "all" | "bullish" | "bearish"
  >("all");
  const [status, setStatus] = useState<
    "all" | "open" | ReviewAction
  >("open");

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();
    return candidates.filter((candidate) => {
      const candidateStatus = statusLabel(candidate);
      return (
        (!normalizedQuery || candidate.symbol.includes(normalizedQuery)) &&
        (direction === "all" || candidate.direction === direction) &&
        (status === "all" || candidateStatus === status)
      );
    });
  }, [candidates, direction, query, status]);

  return (
    <>
      <section
        aria-label="Review filters"
        className="mb-5 grid gap-3 rounded-[20px] border border-white/[0.075] bg-card/80 p-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]"
      >
        <label className="relative">
          <span className="sr-only">Search ticker</span>
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ticker"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 py-3 pl-10 pr-3.5 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Filter direction</span>
          <select
            value={direction}
            onChange={(event) =>
              setDirection(
                event.target.value as "all" | "bullish" | "bearish",
              )
            }
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
          >
            <option value="all">All directions</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filter review state</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | "open" | ReviewAction)
            }
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
          >
            <option value="open">Open only</option>
            <option value="all">All states</option>
            <option value="saved">Saved</option>
            <option value="dismissed">Dismissed</option>
            <option value="deferred">Deferred</option>
            <option value="watchlisted">Watchlisted</option>
          </select>
        </label>
      </section>

      {filteredCandidates.length ? (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate, index) => (
            <ReviewCard
              key={`${candidate.importBatchId}-${candidate.direction}-${candidate.symbol}`}
              candidate={candidate}
              defaultOpen={index === 0}
              watchlists={watchlists}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-[24px] border border-white/[0.075] bg-card/80 px-5 py-14 text-center">
          <Eye aria-hidden="true" className="mx-auto size-6 text-muted" />
          <h2 className="mt-4 text-sm font-semibold">No matching candidates</h2>
          <p className="mt-2 text-xs text-muted">
            Adjust the filters or import a current scanner workbook.
          </p>
        </section>
      )}
    </>
  );
}
