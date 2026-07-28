import { describe, expect, it } from "vitest";

import {
  buildComparisonSeries,
  comparisonCompatibilityError,
  MAX_COMPARISON_ITEMS,
  type ComparisonItem,
} from "@/lib/options/comparison";
import {
  calculateOptionIllustration,
  type OptionIllustrationInput,
} from "@/lib/options/payoff";

function input(
  overrides: Partial<OptionIllustrationInput> = {},
): OptionIllustrationInput {
  return {
    estimatedFees: 1,
    expiry: "2026-09-18",
    legs: [
      {
        ask: 5,
        bid: 4,
        manualFill: null,
        multiplier: 100,
        optionType: "call",
        quantity: 1,
        side: "long",
        strike: 100,
      },
    ],
    pricingMode: "midpoint",
    quoteTime: null,
    spotPrice: 100,
    strategy: "long_call",
    symbol: "AAPL",
    ...overrides,
  };
}

function item(
  id: string,
  overrides: Partial<OptionIllustrationInput> = {},
): ComparisonItem {
  const candidate = input(overrides);
  return {
    id,
    input: candidate,
    label: `Illustration ${id}`,
    result: calculateOptionIllustration(candidate),
  };
}

describe("comparisonCompatibilityError", () => {
  it("accepts different structures when symbol, expiry, and spot match", () => {
    const baseline = item("one");
    const candidate = input({
      legs: [
        {
          ask: 4,
          bid: 3.5,
          manualFill: null,
          multiplier: 100,
          optionType: "put",
          quantity: 2,
          side: "long",
          strike: 100,
        },
      ],
      strategy: "long_put",
      symbol: "aapl",
    });

    expect(comparisonCompatibilityError([baseline], candidate)).toBeNull();
  });

  it("rejects mismatched symbols, expirations, and spot assumptions", () => {
    const baseline = item("one");

    expect(
      comparisonCompatibilityError([baseline], input({ symbol: "MSFT" })),
    ).toContain("same underlying");
    expect(
      comparisonCompatibilityError(
        [baseline],
        input({ expiry: "2026-10-16" }),
      ),
    ).toContain("same expiration");
    expect(
      comparisonCompatibilityError([baseline], input({ spotPrice: 101 })),
    ).toContain("same entered spot");
  });

  it("limits one in-memory comparison to four illustrations", () => {
    const existing = Array.from({ length: MAX_COMPARISON_ITEMS }, (_, index) =>
      item(String(index)),
    );

    expect(comparisonCompatibilityError(existing, input())).toContain(
      "at most 4",
    );
  });
});

describe("buildComparisonSeries", () => {
  it("uses one shared price axis and preserves exact break-even points", () => {
    const call = item("call");
    const put = item("put", {
      legs: [
        {
          ask: 4,
          bid: 4,
          manualFill: null,
          multiplier: 100,
          optionType: "put",
          quantity: 1,
          side: "long",
          strike: 100,
        },
      ],
      strategy: "long_put",
    });
    const series = buildComparisonSeries([call, put], 8);

    expect(series).toHaveLength(2);
    expect(series[0]?.points.map(({ underlyingPrice }) => underlyingPrice)).toEqual(
      series[1]?.points.map(({ underlyingPrice }) => underlyingPrice),
    );
    expect(
      series[0]?.points.some(
        ({ underlyingPrice }) =>
          Math.abs(underlyingPrice - call.result.breakEvens[0]!) < 0.000001,
      ),
    ).toBe(true);
    expect(
      series[1]?.points.some(
        ({ underlyingPrice }) =>
          Math.abs(underlyingPrice - put.result.breakEvens[0]!) < 0.000001,
      ),
    ).toBe(true);
  });
});
