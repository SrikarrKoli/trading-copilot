import { describe, expect, it } from "vitest";

import { OptionInputError } from "@/lib/options/payoff";
import { parseOptionIllustrationInput } from "@/lib/options/validation";

function validPayload() {
  return {
    estimatedFees: 1.25,
    expiry: "2026-09-18",
    legs: [
      {
        ask: 5.2,
        bid: 4.8,
        manualFill: null,
        multiplier: 100,
        optionType: "call",
        quantity: 1,
        side: "long",
        strike: 100,
      },
    ],
    pricingMode: "midpoint",
    quoteTime: "2026-07-28T09:15",
    spotPrice: 101,
    strategy: "long_call",
    symbol: " aapl ",
  };
}

describe("parseOptionIllustrationInput", () => {
  it("normalizes and validates a saved illustration payload", () => {
    const input = parseOptionIllustrationInput(validPayload());

    expect(input.symbol).toBe("AAPL");
    expect(input.legs).toHaveLength(1);
    expect(input.quoteTime).toBe("2026-07-28T09:15");
  });

  it("rejects an invalid quote timestamp before persistence", () => {
    expect(() =>
      parseOptionIllustrationInput({
        ...validPayload(),
        quoteTime: "sometime this morning",
      }),
    ).toThrow(OptionInputError);
  });

  it("reruns structural payoff validation", () => {
    expect(() =>
      parseOptionIllustrationInput({
        ...validPayload(),
        legs: [
          {
            ...validPayload().legs[0],
            side: "short",
          },
        ],
      }),
    ).toThrow("requires the expected long call leg");
  });
});
