import { describe, expect, it } from "vitest";

import {
  calculateSetupAlignment,
  EvidenceInputError,
  type ManualEvidenceInput,
} from "@/lib/evidence/score";

const bullishInput: ManualEvidenceInput = {
  adx: 31,
  atrPercent: 2.1,
  averageVolumeMillions: 8.2,
  direction: "bullish",
  ema20: 98,
  ema50: 94,
  macdSignal: "bullish",
  marketCapBillions: 120,
  observationTime: "2026-07-27T10:35",
  price: 100,
  rangeReference20Day: 101,
  rsi: 62,
  sourceLabel: "Thinkorswim chart",
  symbol: "AAPL",
};

describe("calculateSetupAlignment", () => {
  it("produces a complete 100-point bullish rule match", () => {
    const result = calculateSetupAlignment(bullishInput);

    expect(result.score).toBe(100);
    expect(result.completeness).toBe(100);
    expect(result.components).toHaveLength(10);
    expect(result.components.every(({ status }) => status === "pass")).toBe(
      true,
    );
  });

  it("applies the bearish direction rules independently", () => {
    const result = calculateSetupAlignment({
      ...bullishInput,
      direction: "bearish",
      ema20: 102,
      ema50: 108,
      macdSignal: "bearish",
      rangeReference20Day: 99,
      rsi: 38,
    });

    expect(result.score).toBe(100);
    expect(result.components.every(({ status }) => status === "pass")).toBe(
      true,
    );
  });

  it("keeps strict and inclusive threshold boundaries explicit", () => {
    const result = calculateSetupAlignment({
      ...bullishInput,
      adx: 25,
      atrPercent: 1.5,
      averageVolumeMillions: 3,
      marketCapBillions: 5,
      price: 20,
      rangeReference20Day: 20 / 0.98,
      rsi: 70,
    });

    expect(
      Object.fromEntries(
        result.components.map(({ id, status }) => [id, status]),
      ),
    ).toMatchObject({
      adx: "fail",
      atr_percent: "fail",
      average_volume: "fail",
      market_cap: "fail",
      price: "fail",
      range_proximity: "pass",
      rsi: "pass",
    });
  });

  it("does not publish a score or renormalize when evidence is missing", () => {
    const result = calculateSetupAlignment({
      ...bullishInput,
      adx: null,
      atrPercent: null,
      averageVolumeMillions: null,
      ema20: null,
      ema50: null,
      macdSignal: null,
      marketCapBillions: null,
      price: null,
      rangeReference20Day: null,
      rsi: null,
    });

    expect(result.score).toBeNull();
    expect(result.earnedPoints).toBe(0);
    expect(result.completeness).toBe(0);
    expect(result.components.every(({ status }) => status === "missing")).toBe(
      true,
    );
  });

  it("shows contradictory observations as failed evidence", () => {
    const result = calculateSetupAlignment({
      ...bullishInput,
      macdSignal: "bearish",
      rsi: 48,
    });

    expect(result.score).toBe(80);
    expect(
      result.components
        .filter(({ status }) => status === "fail")
        .map(({ id }) => id),
    ).toEqual(["macd", "rsi"]);
  });

  it("rejects impossible numeric observations", () => {
    expect(() =>
      calculateSetupAlignment({ ...bullishInput, rsi: 101 }),
    ).toThrow(EvidenceInputError);
    expect(() =>
      calculateSetupAlignment({ ...bullishInput, price: -1 }),
    ).toThrow("Price must be greater than zero.");
  });
});
