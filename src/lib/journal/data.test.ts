import { describe, expect, it } from "vitest";

import { buildJournalSnapshot } from "@/lib/journal/data";

const baseEntry = {
  direction: "bullish" as const,
  entry_net_value: 250,
  exit_net_value: null,
  fees: 1.3,
  intended_risk: 250,
  lessons: null,
  mistakes: null,
  reasons_wrong: "The breakout could fail.",
  strategy_type: "long_call" as const,
  tags: ["swing"],
  thesis: "Price is holding above the defined level.",
  trade_plan: "Wait for confirmation and use the documented invalidation.",
};

describe("buildJournalSnapshot", () => {
  it("uses the newest snapshot as current state and retains history", () => {
    const snapshot = buildJournalSnapshot(
      [
        {
          created_at: "2026-07-27T20:00:00.000Z",
          id: "trade-1",
          source_watchlist_item_id: "item-1",
          ticker_symbol: "AAPL",
        },
      ],
      [
        {
          ...baseEntry,
          created_at: "2026-07-27T22:00:00.000Z",
          entry_type: "status_changed",
          exit_net_value: 400,
          id: "entry-new",
          lessons: "Waiting for confirmation improved the entry.",
          note: "Closed manually.",
          realized_pnl: 148.7,
          trade_id: "trade-1",
          trade_status: "closed",
        },
        {
          ...baseEntry,
          created_at: "2026-07-27T20:00:00.000Z",
          entry_type: "plan_created",
          id: "entry-old",
          note: null,
          realized_pnl: null,
          trade_id: "trade-1",
          trade_status: "planned",
        },
      ],
    );

    expect(snapshot.counts).toMatchObject({
      all: 1,
      closed: 1,
      open: 0,
      planned: 0,
    });
    expect(snapshot.realizedPnl).toBe(148.7);
    expect(snapshot.trades[0]).toMatchObject({
      entryCount: 2,
      latest: {
        id: "entry-new",
        status: "closed",
      },
      symbol: "AAPL",
    });
    expect(snapshot.trades[0]?.history.map(({ id }) => id)).toEqual([
      "entry-new",
      "entry-old",
    ]);
  });

  it("does not include open-trade P/L in the closed total", () => {
    const snapshot = buildJournalSnapshot(
      [
        {
          created_at: "2026-07-27T20:00:00.000Z",
          id: "trade-1",
          source_watchlist_item_id: null,
          ticker_symbol: "SPY",
        },
      ],
      [
        {
          ...baseEntry,
          created_at: "2026-07-27T20:00:00.000Z",
          entry_type: "plan_created",
          id: "entry-1",
          note: null,
          realized_pnl: 50,
          trade_id: "trade-1",
          trade_status: "open",
        },
      ],
    );

    expect(snapshot.counts.open).toBe(1);
    expect(snapshot.realizedPnl).toBe(0);
  });
});
