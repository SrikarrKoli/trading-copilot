import { describe, expect, it } from "vitest";

import { buildCandidates } from "@/lib/dashboard/data";

describe("buildCandidates", () => {
  it("keeps the first physical occurrence of each valid symbol", () => {
    const candidates = buildCandidates("bullish", [
      {
        import_batch_id: "batch-1",
        original_row_number: 4,
        ticker_symbol: "AAPL",
        validation_status: "valid",
      },
      {
        import_batch_id: "batch-1",
        original_row_number: 5,
        ticker_symbol: "AAPL",
        validation_status: "duplicate",
      },
      {
        import_batch_id: "batch-1",
        original_row_number: 6,
        ticker_symbol: "MSFT",
        validation_status: "valid",
      },
    ]);

    expect(candidates.map(({ sourceRow, symbol }) => ({ sourceRow, symbol }))).toEqual(
      [
        { sourceRow: 4, symbol: "AAPL" },
        { sourceRow: 6, symbol: "MSFT" },
      ],
    );
  });

  it("does not surface invalid or blank rows", () => {
    expect(
      buildCandidates("bearish", [
        {
          import_batch_id: "batch-2",
          original_row_number: 4,
          ticker_symbol: null,
          validation_status: "invalid",
        },
      ]),
    ).toEqual([]);
  });
});
