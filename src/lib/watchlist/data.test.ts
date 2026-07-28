import { describe, expect, it } from "vitest";

import { buildWatchlistSnapshot } from "@/lib/watchlist/data";

describe("buildWatchlistSnapshot", () => {
  it("groups active symbols and keeps scanner provenance newest first", () => {
    const snapshot = buildWatchlistSnapshot(
      [
        {
          created_at: "2026-07-27T20:00:00.000Z",
          direction: "research",
          id: "list-1",
          name: "Research",
          notes: "Candidates worth another look",
        },
      ],
      [
        {
          added_at: "2026-07-27T21:00:00.000Z",
          id: "item-1",
          thesis: null,
          ticker_symbol: "AAPL",
          watchlist_id: "list-1",
        },
      ],
      [
        {
          added_at: "2026-07-28T21:00:00.000Z",
          direction: "bullish",
          import_batch_id: "new-batch",
          watchlist_item_id: "item-1",
        },
        {
          added_at: "2026-07-27T21:00:00.000Z",
          direction: "bearish",
          import_batch_id: "old-batch",
          watchlist_item_id: "item-1",
        },
      ],
    );

    expect(snapshot).toMatchObject({
      itemCount: 1,
      sourceCount: 2,
      lists: [
        {
          id: "list-1",
          items: [
            {
              latestSource: {
                direction: "bullish",
                importBatchId: "new-batch",
              },
              sourceCount: 2,
              symbol: "AAPL",
            },
          ],
        },
      ],
    });
  });

  it("returns empty membership for a new list", () => {
    const snapshot = buildWatchlistSnapshot(
      [
        {
          created_at: "2026-07-27T20:00:00.000Z",
          direction: "bullish",
          id: "list-1",
          name: "Breakouts",
          notes: null,
        },
      ],
      [],
      [],
    );

    expect(snapshot.itemCount).toBe(0);
    expect(snapshot.sourceCount).toBe(0);
    expect(snapshot.lists[0]?.items).toEqual([]);
  });
});
