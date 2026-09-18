import { describe, expect, it } from "vitest";
import { dashboardNextAction, observationFreshness, summarizeReviews, type DashboardReviewRow } from "./summary";
import type { DashboardCandidate } from "./data";

const candidate: DashboardCandidate = { direction: "bullish", importBatchId: "current", symbol: "AAA", sourceRow: 4, validationStatus: "valid" };
const row: DashboardReviewRow = { id: "1", import_batch_id: "current", direction: "bullish", ticker_symbol: "AAA", action: "deferred", created_at: "2026-09-18T10:00:00Z" };

describe("review summary", () => {
  it("uses only the latest action, ignoring old imports and other directions", () => {
    expect(summarizeReviews([candidate, { ...candidate, symbol: "BBB" }], [
      { ...row, id: "2", action: "saved", created_at: "2026-09-18T11:00:00Z" }, row,
      { ...row, import_batch_id: "old", action: "dismissed" },
      { ...row, direction: "bearish", action: "watchlisted" },
    ])).toEqual({ unreviewed: 1, deferred: 0, saved: 1, dismissed: 0, watchlisted: 0 });
  });
  it("breaks equal timestamp ties by id and handles empty state", () => {
    expect(summarizeReviews([candidate], [row, { ...row, id: "2", action: "dismissed" }]).dismissed).toBe(1);
    expect(summarizeReviews([], []).unreviewed).toBe(0);
  });
});

it("never treats missing, invalid, future, or old observations as fresh", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  for (const timestamp of [null, "invalid", "2026-09-19T00:00:00Z", "2026-09-16T00:00:00Z"]) {
    expect(observationFreshness(timestamp, now)).toMatch(/^Stale/);
  }
  expect(observationFreshness("2026-09-18T10:00:00Z", now)).toBe("Observation within 24 hours");
});

it("offers next steps for empty, partial and completed research", () => {
  expect(dashboardNextAction(0, 0, 0).href).toBe("/imports");
  expect(dashboardNextAction(2, 1, 2).href).toBe("/evidence");
  expect(dashboardNextAction(2, 2, 1).href).toBe("/reviews");
  expect(dashboardNextAction(2, 2, 0).href).toBe("/journal");
});
