import { getDashboardSnapshot } from "@/lib/dashboard/data";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import {
  evidenceCandidateKey,
  getLatestEvidenceAssessmentsForOwner,
} from "@/lib/evidence/data";
import { createClient } from "@/lib/supabase/server";
import type {
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
  const [reviewResult, assessments] = await Promise.all([
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
  ]);
  const { data, error } = reviewResult;

  if (error) {
    throw new Error(`Review history could not be loaded: ${error.message}`);
  }

  const latest = buildLatestReviewActions((data ?? []) as ReviewActionRow[]);
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
