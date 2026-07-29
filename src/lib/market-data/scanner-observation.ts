import type {
  EvidenceDirection,
  MacdSignal,
  ManualEvidenceInput,
} from "@/lib/evidence/score";

export const SCANNER_OBSERVATION_PROVIDER = "schwab" as const;

export interface ScannerMarketObservation {
  adx: number;
  atrPercent: number;
  averageVolumeMillions: number;
  ema20: number;
  ema50: number;
  macdSignal: MacdSignal;
  marketCapBillions: number;
  observedAt: string;
  price: number;
  rangeHigh20Day: number;
  rangeLow20Day: number;
  rsi: number;
  source: typeof SCANNER_OBSERVATION_PROVIDER;
  symbol: string;
}

export interface ScannerMarketDataProvider {
  getScannerObservations(
    symbols: string[],
  ): Promise<ScannerMarketObservation[]>;
  readonly provider: typeof SCANNER_OBSERVATION_PROVIDER;
}

export function buildEvidenceInputFromMarketObservation(
  observation: ScannerMarketObservation,
  direction: EvidenceDirection,
): ManualEvidenceInput {
  return {
    adx: observation.adx,
    atrPercent: observation.atrPercent,
    averageVolumeMillions: observation.averageVolumeMillions,
    direction,
    ema20: observation.ema20,
    ema50: observation.ema50,
    macdSignal: observation.macdSignal,
    marketCapBillions: observation.marketCapBillions,
    observationTime: observation.observedAt,
    price: observation.price,
    rangeReference20Day:
      direction === "bullish"
        ? observation.rangeHigh20Day
        : observation.rangeLow20Day,
    rsi: observation.rsi,
    sourceLabel: "Schwab Trader API",
    symbol: observation.symbol,
  };
}
