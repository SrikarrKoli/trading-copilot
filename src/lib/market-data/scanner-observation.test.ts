import { describe, expect, it } from "vitest";

import {
  buildEvidenceInputFromMarketObservation,
  type ScannerMarketObservation,
} from "@/lib/market-data/scanner-observation";

const observation: ScannerMarketObservation = {
  adx: 27,
  atrPercent: 2.1,
  averageVolumeMillions: 4.2,
  ema20: 101,
  ema50: 98,
  macdSignal: "bullish",
  marketCapBillions: 120,
  observedAt: "2026-07-29T15:35:00.000Z",
  price: 104,
  rangeHigh20Day: 105,
  rangeLow20Day: 92,
  rsi: 62,
  source: "schwab",
  symbol: "AAPL",
};

describe("buildEvidenceInputFromMarketObservation", () => {
  it("uses the 20-day high for a bullish candidate", () => {
    expect(
      buildEvidenceInputFromMarketObservation(observation, "bullish"),
    ).toMatchObject({
      direction: "bullish",
      observationTime: "2026-07-29T15:35:00.000Z",
      rangeReference20Day: 105,
      sourceLabel: "Schwab Trader API",
      symbol: "AAPL",
    });
  });

  it("uses the 20-day low for a bearish candidate", () => {
    expect(
      buildEvidenceInputFromMarketObservation(observation, "bearish"),
    ).toMatchObject({
      direction: "bearish",
      rangeReference20Day: 92,
    });
  });
});
