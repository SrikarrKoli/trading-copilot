import { describe, expect, it } from "vitest";

import {
  calculateOptionIllustration,
  expirationPnl,
  OptionInputError,
  type OptionIllustrationInput,
} from "@/lib/options/payoff";

function baseInput(
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
    pricingMode: "natural",
    quoteTime: "2026-07-27T10:00",
    spotPrice: 100,
    strategy: "long_call",
    symbol: "AAPL",
    ...overrides,
  };
}

describe("calculateOptionIllustration", () => {
  it("calculates long-call debit, loss, break-even, and uncapped upside", () => {
    const illustration = calculateOptionIllustration(baseInput());

    expect(illustration.netDebit).toBe(500);
    expect(illustration.totalEntryCost).toBe(501);
    expect(illustration.maxLoss).toBe(501);
    expect(illustration.maxProfit).toBe("unbounded");
    expect(illustration.breakEvens[0]).toBeCloseTo(105.01, 8);
    expect(expirationPnl(illustration.legs, 120, 1)).toBe(1499);
  });

  it("calculates a multi-contract long put at zero and below strike", () => {
    const illustration = calculateOptionIllustration(
      baseInput({
        estimatedFees: 2,
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
      }),
    );

    expect(illustration.netDebit).toBe(800);
    expect(illustration.maxLoss).toBe(802);
    expect(illustration.maxProfit).toBe(19_198);
    expect(illustration.breakEvens[0]).toBeCloseTo(95.99, 8);
    expect(expirationPnl(illustration.legs, 90, 2)).toBe(1198);
  });

  it("calculates a bull call debit spread using natural fills", () => {
    const illustration = calculateOptionIllustration(
      baseInput({
        estimatedFees: 2,
        legs: [
          {
            ask: 5,
            bid: 4.5,
            manualFill: null,
            multiplier: 100,
            optionType: "call",
            quantity: 1,
            side: "long",
            strike: 100,
          },
          {
            ask: 2.5,
            bid: 2,
            manualFill: null,
            multiplier: 100,
            optionType: "call",
            quantity: 1,
            side: "short",
            strike: 110,
          },
        ],
        strategy: "bull_call_debit_spread",
      }),
    );

    expect(illustration.netDebit).toBe(300);
    expect(illustration.maxLoss).toBe(302);
    expect(illustration.maxProfit).toBe(698);
    expect(illustration.breakEvens[0]).toBeCloseTo(103.02, 8);
    expect(expirationPnl(illustration.legs, 105, 2)).toBe(198);
  });

  it("calculates a bear put debit spread using natural fills", () => {
    const illustration = calculateOptionIllustration(
      baseInput({
        estimatedFees: 2,
        legs: [
          {
            ask: 6,
            bid: 5.5,
            manualFill: null,
            multiplier: 100,
            optionType: "put",
            quantity: 1,
            side: "long",
            strike: 100,
          },
          {
            ask: 2.5,
            bid: 2,
            manualFill: null,
            multiplier: 100,
            optionType: "put",
            quantity: 1,
            side: "short",
            strike: 90,
          },
        ],
        strategy: "bear_put_debit_spread",
      }),
    );

    expect(illustration.netDebit).toBe(400);
    expect(illustration.maxLoss).toBe(402);
    expect(illustration.maxProfit).toBe(598);
    expect(illustration.breakEvens[0]).toBeCloseTo(95.98, 8);
    expect(expirationPnl(illustration.legs, 95, 2)).toBe(98);
  });

  it("uses midpoint pricing for both long and short legs", () => {
    const illustration = calculateOptionIllustration(
      baseInput({
        legs: [
          {
            ask: 6,
            bid: 4,
            manualFill: null,
            multiplier: 100,
            optionType: "call",
            quantity: 1,
            side: "long",
            strike: 100,
          },
          {
            ask: 3,
            bid: 1,
            manualFill: null,
            multiplier: 100,
            optionType: "call",
            quantity: 1,
            side: "short",
            strike: 110,
          },
        ],
        pricingMode: "midpoint",
        strategy: "bull_call_debit_spread",
      }),
    );

    expect(illustration.legs.map(({ selectedFill }) => selectedFill)).toEqual([
      5, 2,
    ]);
    expect(illustration.netDebit).toBe(300);
  });

  it("rejects inverted quotes and invalid vertical strike order", () => {
    expect(() =>
      calculateOptionIllustration(
        baseInput({
          legs: [
            {
              ask: 4,
              bid: 5,
              manualFill: null,
              multiplier: 100,
              optionType: "call",
              quantity: 1,
              side: "long",
              strike: 100,
            },
          ],
        }),
      ),
    ).toThrow(OptionInputError);

    expect(() =>
      calculateOptionIllustration(
        baseInput({
          legs: [
            {
              ask: 5,
              bid: 4,
              manualFill: null,
              multiplier: 100,
              optionType: "call",
              quantity: 1,
              side: "long",
              strike: 110,
            },
            {
              ask: 2,
              bid: 1,
              manualFill: null,
              multiplier: 100,
              optionType: "call",
              quantity: 1,
              side: "short",
              strike: 100,
            },
          ],
          strategy: "bull_call_debit_spread",
        }),
      ),
    ).toThrow("long strike below");
  });
});
