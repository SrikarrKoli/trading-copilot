import type { DashboardCandidate } from "@/lib/dashboard/data";
import type { EvidenceDirection } from "@/lib/evidence/score";
import { createClient } from "@/lib/supabase/server";

export interface SavedEvidenceAssessment {
  direction: EvidenceDirection;
  id: string;
  importBatchId: string;
  observationSource: string;
  observationTimestamp: string;
  savedAt: string;
  score: number;
  scoreVersion: string;
  symbol: string;
}

export interface EvidenceRankedCandidate extends DashboardCandidate {
  latestEvidence: SavedEvidenceAssessment | null;
}

export interface EvidenceAssessmentRow {
  direction: EvidenceDirection;
  id: string;
  import_batch_id: string;
  observation_source: string;
  observation_timestamp: string;
  saved_at: string;
  score_version: string;
  setup_alignment: number | string;
  ticker_symbol: string;
}

export function evidenceCandidateKey(
  importBatchId: string,
  direction: EvidenceDirection,
  symbol: string,
): string {
  return `${importBatchId}:${direction}:${symbol}`;
}

function mapAssessment(row: EvidenceAssessmentRow): SavedEvidenceAssessment {
  return {
    direction: row.direction,
    id: row.id,
    importBatchId: row.import_batch_id,
    observationSource: row.observation_source,
    observationTimestamp: row.observation_timestamp,
    savedAt: row.saved_at,
    score: Number(row.setup_alignment),
    scoreVersion: row.score_version,
    symbol: row.ticker_symbol,
  };
}

export function buildLatestEvidenceAssessments(
  rows: EvidenceAssessmentRow[],
): SavedEvidenceAssessment[] {
  const latest = new Map<string, SavedEvidenceAssessment>();

  for (const row of rows) {
    const key = evidenceCandidateKey(
      row.import_batch_id,
      row.direction,
      row.ticker_symbol,
    );
    if (!latest.has(key)) {
      latest.set(key, mapAssessment(row));
    }
  }

  return [...latest.values()];
}

export function rankCurrentCandidatesByEvidence(
  candidates: DashboardCandidate[],
  assessments: SavedEvidenceAssessment[],
): EvidenceRankedCandidate[] {
  const latest = new Map(
    assessments.map((assessment) => [
      evidenceCandidateKey(
        assessment.importBatchId,
        assessment.direction,
        assessment.symbol,
      ),
      assessment,
    ]),
  );

  return candidates
    .map((candidate) => ({
      ...candidate,
      latestEvidence:
        latest.get(
          evidenceCandidateKey(
            candidate.importBatchId,
            candidate.direction,
            candidate.symbol,
          ),
        ) ?? null,
    }))
    .toSorted((left, right) => {
      if (left.latestEvidence && right.latestEvidence) {
        return (
          right.latestEvidence.score - left.latestEvidence.score ||
          left.sourceRow - right.sourceRow ||
          left.symbol.localeCompare(right.symbol)
        );
      }
      if (left.latestEvidence) return -1;
      if (right.latestEvidence) return 1;
      return (
        left.sourceRow - right.sourceRow ||
        left.symbol.localeCompare(right.symbol)
      );
    });
}

export async function getLatestEvidenceAssessmentsForOwner(
  ownerId: string,
  candidates: DashboardCandidate[],
): Promise<SavedEvidenceAssessment[]> {
  const batchIds = [
    ...new Set(candidates.map(({ importBatchId }) => importBatchId)),
  ];
  if (!batchIds.length) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manual_evidence_assessments")
    .select(
      "id, import_batch_id, direction, ticker_symbol, score_version, setup_alignment, observation_timestamp, observation_source, saved_at",
    )
    .eq("owner_id", ownerId)
    .in("import_batch_id", batchIds)
    .order("saved_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Saved evidence could not be loaded: ${error.message}`);
  }

  return buildLatestEvidenceAssessments(
    (data ?? []) as EvidenceAssessmentRow[],
  );
}
