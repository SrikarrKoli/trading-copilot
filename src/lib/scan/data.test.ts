import { describe, expect, it } from "vitest";

import { buildSavedScanRuns } from "@/lib/scan/data";

const definition = {
  change_note: "Initial descriptive version",
  created_at: "2026-07-27T20:00:00.000Z",
  direction: "bullish" as const,
  display_name: "Momentum weekly options",
  id: "definition-1",
  lifecycle_status: "experimental" as const,
  rule_summary: "Exact Thinkorswim criteria pending capture.",
  scanner_key: "momentum-weekly-options",
  session_scope: "regular" as const,
  timeframe: "weekly",
  version_major: 1,
  version_minor: 2,
  version_patch: 3,
};

describe("buildSavedScanRuns", () => {
  it("joins immutable definition and import provenance to ordered results", () => {
    const snapshot = buildSavedScanRuns(
      [definition],
      [
        {
          direction: "bullish",
          id: "run-1",
          import_batch_id: "batch-1",
          market_data_timestamp: null,
          name: "Monday open",
          notes: null,
          saved_at: "2026-07-27T21:00:00.000Z",
          scanner_definition_id: "definition-1",
        },
      ],
      [
        {
          candidate_order: 2,
          first_source_row_number: 5,
          scan_run_id: "run-1",
          source_observation_timestamp: null,
          source_occurrence_count: 1,
          source_sheet_name: "Sheet1",
          ticker_symbol: "MSFT",
        },
        {
          candidate_order: 1,
          first_source_row_number: 2,
          scan_run_id: "run-1",
          source_observation_timestamp: null,
          source_occurrence_count: 2,
          source_sheet_name: "Sheet1",
          ticker_symbol: "AAPL",
        },
      ],
      [
        {
          id: "batch-1",
          market_data_timestamp: null,
          original_filename: "bullish.xlsx",
          uploaded_at: "2026-07-27T19:00:00.000Z",
        },
      ],
    );

    expect(snapshot.definitions[0]?.version).toBe("1.2.3");
    expect(snapshot.runs[0]).toMatchObject({
      definition: { id: "definition-1", lifecycleStatus: "experimental" },
      sourceFilename: "bullish.xlsx",
      results: [
        { occurrenceCount: 2, symbol: "AAPL" },
        { occurrenceCount: 1, symbol: "MSFT" },
      ],
    });
  });

  it("does not create a run when its immutable definition is unavailable", () => {
    const snapshot = buildSavedScanRuns(
      [],
      [
        {
          direction: "bearish",
          id: "run-1",
          import_batch_id: "batch-1",
          market_data_timestamp: null,
          name: "Snapshot",
          notes: null,
          saved_at: "2026-07-27T21:00:00.000Z",
          scanner_definition_id: "missing",
        },
      ],
      [],
      [],
    );

    expect(snapshot.runs).toEqual([]);
  });
});
