import { describe, expect, it } from "vitest";

import {
  parseStrategyLabSourceRequest,
  strategyLabSourceHref,
  strategySourceRequestFromSearchParams,
} from "@/lib/options/source-request";

const BATCH_ID = "11111111-1111-4111-8111-111111111111";
const WATCHLIST_ITEM_ID = "22222222-2222-4222-8222-222222222222";

describe("parseStrategyLabSourceRequest", () => {
  it("normalizes a valid review request", () => {
    expect(
      parseStrategyLabSourceRequest({
        direction: "bullish",
        importBatchId: BATCH_ID,
        kind: "review",
        symbol: " aapl ",
      }),
    ).toEqual({
      direction: "bullish",
      importBatchId: BATCH_ID,
      kind: "review",
      symbol: "AAPL",
    });
  });

  it("accepts a valid watchlist request", () => {
    expect(
      parseStrategyLabSourceRequest({
        kind: "watchlist",
        watchlistItemId: WATCHLIST_ITEM_ID,
      }),
    ).toEqual({
      kind: "watchlist",
      watchlistItemId: WATCHLIST_ITEM_ID,
    });
  });

  it("rejects malformed identifiers, directions, and symbols", () => {
    expect(
      parseStrategyLabSourceRequest({
        direction: "neutral",
        importBatchId: "not-a-uuid",
        kind: "review",
        symbol: "AAPL<script>",
      }),
    ).toBeNull();
  });
});

describe("Strategy Lab source URLs", () => {
  it("round-trips a review source", () => {
    const request = {
      direction: "bearish" as const,
      importBatchId: BATCH_ID,
      kind: "review" as const,
      symbol: "BRK/B",
    };
    const href = strategyLabSourceHref(request);
    const search = new URL(href, "https://example.test").searchParams;

    expect(
      strategySourceRequestFromSearchParams({
        direction: search.get("direction") ?? undefined,
        importBatch: search.get("importBatch") ?? undefined,
        symbol: search.get("symbol") ?? undefined,
      }),
    ).toEqual(request);
  });

  it("prefers a valid watchlist item over other source fields", () => {
    expect(
      strategySourceRequestFromSearchParams({
        direction: "bullish",
        importBatch: BATCH_ID,
        symbol: "AAPL",
        watchlistItem: WATCHLIST_ITEM_ID,
      }),
    ).toEqual({
      kind: "watchlist",
      watchlistItemId: WATCHLIST_ITEM_ID,
    });
  });
});
