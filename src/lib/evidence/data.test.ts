import { describe, expect, it } from "vitest";

import {
  buildLatestEvidenceAssessments,
  type EvidenceAssessmentRow,
  rankCurrentCandidatesByEvidence,
  type SavedEvidenceAssessment,
} from "@/lib/evidence/data";

function row(
  overrides: Partial<EvidenceAssessmentRow> = {},
): EvidenceAssessmentRow {
  return {
    direction: "bullish",
    id: "assessment-2",
    import_batch_id: "batch-1",
    observation_source: "Thinkorswim",
    observation_timestamp: "2026-07-27T15:35:00.000Z",
    saved_at: "2026-07-27T15:40:00.000Z",
    score_version: "manual-high-conviction-v1.0.0",
    setup_alignment: 80,
    ticker_symbol: "AAPL",
    ...overrides,
  };
}

describe("buildLatestEvidenceAssessments", () => {
  it("keeps the first, already ordered row for each current candidate", () => {
    const assessments = buildLatestEvidenceAssessments([
      row(),
      row({
        id: "assessment-1",
        saved_at: "2026-07-27T15:30:00.000Z",
        setup_alignment: 60,
      }),
      row({
        direction: "bearish",
        id: "assessment-3",
        import_batch_id: "batch-2",
        setup_alignment: "70",
        ticker_symbol: "ALAB",
      }),
    ]);

    expect(
      assessments.map(({ direction, id, score, symbol }) => ({
        direction,
        id,
        score,
        symbol,
      })),
    ).toEqual([
      {
        direction: "bullish",
        id: "assessment-2",
        score: 80,
        symbol: "AAPL",
      },
      {
        direction: "bearish",
        id: "assessment-3",
        score: 70,
        symbol: "ALAB",
      },
    ]);
  });

  it("keeps assessments from different import batches distinct", () => {
    expect(
      buildLatestEvidenceAssessments([
        row(),
        row({ id: "assessment-older-batch", import_batch_id: "batch-old" }),
      ]),
    ).toHaveLength(2);
  });
});

describe("rankCurrentCandidatesByEvidence", () => {
  const candidates = [
    {
      direction: "bullish" as const,
      importBatchId: "batch-1",
      sourceRow: 4,
      symbol: "AAPL",
      validationStatus: "valid" as const,
    },
    {
      direction: "bullish" as const,
      importBatchId: "batch-1",
      sourceRow: 5,
      symbol: "MSFT",
      validationStatus: "valid" as const,
    },
    {
      direction: "bullish" as const,
      importBatchId: "batch-1",
      sourceRow: 6,
      symbol: "TSLA",
      validationStatus: "valid" as const,
    },
  ];

  function assessment(
    symbol: string,
    score: number,
    overrides: Partial<SavedEvidenceAssessment> = {},
  ): SavedEvidenceAssessment {
    return {
      direction: "bullish",
      id: `assessment-${symbol}`,
      importBatchId: "batch-1",
      observationSource: "Thinkorswim",
      observationTimestamp: "2026-07-27T15:35:00.000Z",
      savedAt: "2026-07-27T15:40:00.000Z",
      score,
      scoreVersion: "manual-high-conviction-v1.0.0",
      symbol,
      ...overrides,
    };
  }

  it("sorts assessed candidates by score and leaves missing scores explicit", () => {
    const ranked = rankCurrentCandidatesByEvidence(candidates, [
      assessment("AAPL", 70),
      assessment("MSFT", 90),
    ]);

    expect(
      ranked.map(({ latestEvidence, symbol }) => ({
        score: latestEvidence?.score ?? null,
        symbol,
      })),
    ).toEqual([
      { score: 90, symbol: "MSFT" },
      { score: 70, symbol: "AAPL" },
      { score: null, symbol: "TSLA" },
    ]);
  });

  it("uses source order for ties and ignores assessments from old batches", () => {
    const ranked = rankCurrentCandidatesByEvidence(candidates, [
      assessment("AAPL", 80),
      assessment("MSFT", 80),
      assessment("TSLA", 100, {
        id: "old-assessment",
        importBatchId: "old-batch",
      }),
    ]);

    expect(ranked.map(({ symbol }) => symbol)).toEqual([
      "AAPL",
      "MSFT",
      "TSLA",
    ]);
    expect(ranked[2]?.latestEvidence).toBeNull();
  });
});
