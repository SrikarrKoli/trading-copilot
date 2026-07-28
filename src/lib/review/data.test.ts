import { describe, expect, it } from "vitest";

import {
  buildLatestCandidateStrategies,
  buildLatestReviewActions,
  reviewCandidateKey,
} from "@/lib/review/data";

describe("buildLatestReviewActions", () => {
  it("keeps the first row from a newest-first review history", () => {
    const latest = buildLatestReviewActions([
      {
        action: "saved",
        created_at: "2026-07-27T20:00:00.000Z",
        direction: "bullish",
        id: "newer",
        import_batch_id: "batch-1",
        note: "Current state",
        reason_code: "strong_setup",
        ticker_symbol: "AAPL",
      },
      {
        action: "deferred",
        created_at: "2026-07-27T19:00:00.000Z",
        direction: "bullish",
        id: "older",
        import_batch_id: "batch-1",
        note: null,
        reason_code: "review_later",
        ticker_symbol: "AAPL",
      },
    ]);

    expect(
      latest.get(reviewCandidateKey("batch-1", "bullish", "AAPL")),
    ).toMatchObject({
      action: "saved",
      id: "newer",
      reasonCode: "strong_setup",
    });
  });

  it("tracks bullish and bearish occurrences independently", () => {
    const latest = buildLatestReviewActions([
      {
        action: "saved",
        created_at: "2026-07-27T20:00:00.000Z",
        direction: "bullish",
        id: "bullish-action",
        import_batch_id: "batch-1",
        note: null,
        reason_code: "strong_setup",
        ticker_symbol: "SPY",
      },
      {
        action: "dismissed",
        created_at: "2026-07-27T20:00:00.000Z",
        direction: "bearish",
        id: "bearish-action",
        import_batch_id: "batch-2",
        note: null,
        reason_code: "outside_plan",
        ticker_symbol: "SPY",
      },
    ]);

    expect(latest.size).toBe(2);
  });
});

describe("buildLatestCandidateStrategies", () => {
  it("keeps the newest strategy and its newest journal link", () => {
    const progress = buildLatestCandidateStrategies(
      [
        {
          created_at: "2026-07-28T19:00:00.000Z",
          direction: "bullish",
          illustration_id: "illustration-old",
          import_batch_id: "batch-1",
          ticker_symbol: "AAPL",
        },
        {
          created_at: "2026-07-28T20:00:00.000Z",
          direction: "bullish",
          illustration_id: "illustration-new",
          import_batch_id: "batch-1",
          ticker_symbol: "AAPL",
        },
      ],
      [
        {
          linked_at: "2026-07-28T20:30:00.000Z",
          option_illustration_id: "illustration-new",
          trade_id: "trade-old",
        },
        {
          linked_at: "2026-07-28T21:00:00.000Z",
          option_illustration_id: "illustration-new",
          trade_id: "trade-new",
        },
      ],
    );

    expect(
      progress.get(reviewCandidateKey("batch-1", "bullish", "AAPL")),
    ).toEqual({
      createdAt: "2026-07-28T20:00:00.000Z",
      illustrationId: "illustration-new",
      journalTradeId: "trade-new",
    });
  });

  it("does not combine the same ticker across candidate identities", () => {
    const progress = buildLatestCandidateStrategies(
      [
        {
          created_at: "2026-07-28T20:00:00.000Z",
          direction: "bullish",
          illustration_id: "illustration-bull",
          import_batch_id: "batch-1",
          ticker_symbol: "SPY",
        },
        {
          created_at: "2026-07-28T20:00:00.000Z",
          direction: "bearish",
          illustration_id: "illustration-bear",
          import_batch_id: "batch-2",
          ticker_symbol: "SPY",
        },
      ],
      [],
    );

    expect(progress.size).toBe(2);
  });
});
