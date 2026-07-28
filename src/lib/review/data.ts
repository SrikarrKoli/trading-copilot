import { getDashboardSnapshot } from "@/lib/dashboard/data";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import {
  evidenceCandidateKey,
  getLatestEvidenceAssessmentsForOwner,
} from "@/lib/evidence/data";
import { createClient } from "@/lib/supabase/server";
import type {
  CandidateStrategyProgress,
  LatestReviewAction,
  ReviewAction,
  ReviewQueueSnapshot,
  ReviewReason,
} from "@/lib/review/types";

interface ReviewActionRow {
  action: ReviewAction;
  created_at: string;
  direction: "bullish" | "bearish";
  id: string;
  import_batch_id: string;
  note: string | null;
  reason_code: ReviewReason;
  ticker_symbol: string;
}

interface CandidateStrategyRow {
  created_at: string;
  direction: "bullish" | "bearish";
  illustration_id: string;
  import_batch_id: string;
  ticker_symbol: string;
}

interface StrategyJournalRow {
  linked_at: string;
  option_illustration_id: string;
  trade_id: string;
}

export function reviewCandidateKey(
  importBatchId: string,
  direction: "bullish" | "bearish",
  symbol: string,
): string {
  return `${importBatchId}:${direction}:${symbol}`;
}

export function buildLatestReviewActions(
  rows: ReviewActionRow[],
): Map<string, LatestReviewAction> {
  const latest = new Map<string, LatestReviewAction>();

  for (const row of rows) {
    const key = reviewCandidateKey(
      row.import_batch_id,
      row.direction,
      row.ticker_symbol,
    );

    if (!latest.has(key)) {
      latest.set(key, {
        action: row.action,
        createdAt: row.created_at,
        id: row.id,
        note: row.note,
        reasonCode: row.reason_code,
      });
    }
  }

  return latest;
}

export function buildLatestCandidateStrategies(
  sourceRows: CandidateStrategyRow[],
  journalRows: StrategyJournalRow[],
): Map<string, CandidateStrategyProgress> {
  const journalByIllustration = new Map<string, string>();
  for (const row of journalRows.toSorted(
    (left, right) =>
      right.linked_at.localeCompare(left.linked_at) ||
      right.trade_id.localeCompare(left.trade_id),
  )) {
    if (!journalByIllustration.has(row.option_illustration_id)) {
      journalByIllustration.set(row.option_illustration_id, row.trade_id);
    }
  }

  const latest = new Map<string, CandidateStrategyProgress>();
  for (const row of sourceRows.toSorted(
    (left, right) =>
      right.created_at.localeCompare(left.created_at) ||
      right.illustration_id.localeCompare(left.illustration_id),
  )) {
    const key = reviewCandidateKey(
      row.import_batch_id,
      row.direction,
      row.ticker_symbol,
    );
    if (!latest.has(key)) {
      latest.set(key, {
        createdAt: row.created_at,
        illustrationId: row.illustration_id,
        journalTradeId:
          journalByIllustration.get(row.illustration_id) ?? null,
      });
    }
  }
  return latest;
}

export async function getReviewQueueSnapshot(): Promise<ReviewQueueSnapshot> {
  const [dashboard, claims] = await Promise.all([
    getDashboardSnapshot(),
    getPermanentOwnerClaims(),
  ]);
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }

  const candidates = [
    ...dashboard.candidates.bullish,
    ...dashboard.candidates.bearish,
  ];
  const batchIds = [...new Set(candidates.map(({ importBatchId }) => importBatchId))];

  if (!batchIds.length) {
    return {
      candidates: [],
      counts: { all: 0, bearish: 0, bullish: 0 },
    };
  }

  const supabase = await createClient();
  const [reviewResult, assessments, strategyResult] = await Promise.all([
    supabase
      .from("review_actions")
      .select(
        "id, import_batch_id, direction, ticker_symbol, action, reason_code, note, created_at",
      )
      .eq("owner_id", ownerId)
      .in("import_batch_id", batchIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    getLatestEvidenceAssessmentsForOwner(ownerId, candidates),
    supabase
      .from("option_illustration_sources")
      .select(
        "illustration_id, import_batch_id, direction, ticker_symbol, created_at",
      )
      .eq("owner_id", ownerId)
      .in("import_batch_id", batchIds)
      .order("created_at", { ascending: false })
      .order("illustration_id", { ascending: false }),
  ]);
  const { data, error } = reviewResult;

  if (error) {
    throw new Error(`Review history could not be loaded: ${error.message}`);
  }
  if (strategyResult.error) {
    throw new Error(
      `Candidate strategy progress could not be loaded: ${strategyResult.error.message}`,
    );
  }

  const latest = buildLatestReviewActions((data ?? []) as ReviewActionRow[]);
  const strategyRows = (strategyResult.data ?? []) as CandidateStrategyRow[];
  const strategyIds = [
    ...new Set(strategyRows.map(({ illustration_id }) => illustration_id)),
  ];
  let journalRows: StrategyJournalRow[] = [];

  if (strategyIds.length) {
    const { data: journalData, error: journalError } = await supabase
      .from("trade_option_illustration_sources")
      .select("trade_id, option_illustration_id, linked_at")
      .eq("owner_id", ownerId)
      .in("option_illustration_id", strategyIds)
      .order("linked_at", { ascending: false })
      .order("trade_id", { ascending: false });

    if (journalError) {
      throw new Error(
        `Candidate journal progress could not be loaded: ${journalError.message}`,
      );
    }
    journalRows = (journalData ?? []) as StrategyJournalRow[];
  }

  const strategyProgress = buildLatestCandidateStrategies(
    strategyRows,
    journalRows,
  );
  const latestEvidence = new Map(
    assessments.map((assessment) => [
      evidenceCandidateKey(
        assessment.importBatchId,
        assessment.direction,
        assessment.symbol,
      ),
      assessment,
    ]),
  );
  const queueCandidates = candidates.map((candidate) => ({
    ...candidate,
    latestAction:
      latest.get(
        reviewCandidateKey(
          candidate.importBatchId,
          candidate.direction,
          candidate.symbol,
        ),
      ) ?? null,
    latestEvidence:
      latestEvidence.get(
        evidenceCandidateKey(
          candidate.importBatchId,
          candidate.direction,
          candidate.symbol,
        ),
      ) ?? null,
    strategyProgress:
      strategyProgress.get(
        reviewCandidateKey(
          candidate.importBatchId,
          candidate.direction,
          candidate.symbol,
        ),
      ) ?? null,
  }));

  return {
    candidates: queueCandidates,
    counts: {
      all: queueCandidates.length,
      bearish: dashboard.candidates.bearish.length,
      bullish: dashboard.candidates.bullish.length,
    },
  };
}
