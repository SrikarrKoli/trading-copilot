import type { DashboardCandidate } from "@/lib/dashboard/data";
import type { ReviewAction } from "@/lib/review/types";

export interface DashboardReviewRow {
  id: string;
  import_batch_id: string;
  direction: "bullish" | "bearish";
  ticker_symbol: string;
  action: ReviewAction;
  created_at: string;
}

export function summarizeReviews(candidates: DashboardCandidate[], rows: DashboardReviewRow[]) {
  const latest = new Map<string, DashboardReviewRow>();
  for (const row of rows) {
    const key = `${row.import_batch_id}:${row.direction}:${row.ticker_symbol}`;
    const previous = latest.get(key);
    if (!previous || row.created_at > previous.created_at ||
        (row.created_at === previous.created_at && row.id > previous.id)) latest.set(key, row);
  }
  const counts = { unreviewed: 0, saved: 0, dismissed: 0, deferred: 0, watchlisted: 0 };
  for (const candidate of candidates) {
    const action = latest.get(`${candidate.importBatchId}:${candidate.direction}:${candidate.symbol}`)?.action;
    counts[action ?? "unreviewed"]++;
  }
  return counts;
}

export function observationFreshness(timestamp: string | null, now = Date.now()) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return "Stale · observation time missing";
  const age = now - Date.parse(timestamp);
  if (age < 0) return "Stale · observation time is in the future";
  return age > 24 * 60 * 60 * 1000 ? "Stale · observation older than 24 hours" : "Observation within 24 hours";
}

export function dashboardNextAction(candidateCount: number, assessedCount: number, unreviewedCount: number) {
  if (!candidateCount) return { href: "/imports", label: "Import scanner candidates" };
  if (assessedCount < candidateCount) return { href: "/evidence", label: "Complete evidence assessments" };
  if (unreviewedCount) return { href: "/reviews", label: "Review remaining candidates" };
  return { href: "/journal", label: "Reflect in your journal" };
}
