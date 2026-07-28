export const SETUP_ALIGNMENT_VERSION = "manual-high-conviction-v1.0.0";
export const SETUP_ALIGNMENT_COMPONENT_COUNT = 10;
export const SETUP_ALIGNMENT_POINTS_PER_COMPONENT = 10;

export type EvidenceDirection = "bullish" | "bearish";
export type MacdSignal = EvidenceDirection | "neutral";
export type EvidenceStatus = "pass" | "fail" | "missing";

export interface ManualEvidenceInput {
  adx: number | null;
  atrPercent: number | null;
  averageVolumeMillions: number | null;
  direction: EvidenceDirection;
  ema20: number | null;
  ema50: number | null;
  macdSignal: MacdSignal | null;
  marketCapBillions: number | null;
  observationTime: string | null;
  price: number | null;
  rangeReference20Day: number | null;
  rsi: number | null;
  sourceLabel: string | null;
  symbol: string;
}

export interface EvidenceComponentResult {
  availablePoints: number;
  earnedPoints: number;
  id:
    | "price"
    | "market_cap"
    | "ema_20"
    | "ema_50"
    | "macd"
    | "rsi"
    | "atr_percent"
    | "adx"
    | "average_volume"
    | "range_proximity";
  label: string;
  observed: string;
  rule: string;
  status: EvidenceStatus;
}

export interface SetupAlignmentResult {
  complete: boolean;
  completeness: number;
  components: EvidenceComponentResult[];
  earnedPoints: number;
  evidenceAvailable: number;
  evidenceRequired: number;
  score: number | null;
  version: string;
}

export class EvidenceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceInputError";
  }
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function validateOptionalNumber(
  label: string,
  value: number | null,
  options: { maximum?: number; positive?: boolean } = {},
): void {
  if (value === null) return;
  if (!Number.isFinite(value)) {
    throw new EvidenceInputError(`${label} must be a finite number.`);
  }
  if (options.positive ? value <= 0 : value < 0) {
    throw new EvidenceInputError(
      `${label} must be ${options.positive ? "greater than zero" : "zero or greater"}.`,
    );
  }
  if (options.maximum !== undefined && value > options.maximum) {
    throw new EvidenceInputError(
      `${label} must be ${options.maximum} or less.`,
    );
  }
}

function component({
  available,
  id,
  label,
  observed,
  passed,
  rule,
}: {
  available: boolean;
  id: EvidenceComponentResult["id"];
  label: string;
  observed: string;
  passed: boolean;
  rule: string;
}): EvidenceComponentResult {
  const status: EvidenceStatus = available
    ? passed
      ? "pass"
      : "fail"
    : "missing";

  return {
    availablePoints: SETUP_ALIGNMENT_POINTS_PER_COMPONENT,
    earnedPoints:
      status === "pass" ? SETUP_ALIGNMENT_POINTS_PER_COMPONENT : 0,
    id,
    label,
    observed: available ? observed : "Not supplied",
    rule,
    status,
  };
}

export function calculateSetupAlignment(
  input: ManualEvidenceInput,
): SetupAlignmentResult {
  if (!input.symbol.trim()) {
    throw new EvidenceInputError("Choose a candidate symbol.");
  }

  validateOptionalNumber("Price", input.price, { positive: true });
  validateOptionalNumber("Market capitalization", input.marketCapBillions);
  validateOptionalNumber("20 EMA", input.ema20, { positive: true });
  validateOptionalNumber("50 EMA", input.ema50, { positive: true });
  validateOptionalNumber("RSI", input.rsi, { maximum: 100 });
  validateOptionalNumber("ATR percentage", input.atrPercent);
  validateOptionalNumber("ADX", input.adx);
  validateOptionalNumber("Average volume", input.averageVolumeMillions);
  validateOptionalNumber("20-day range reference", input.rangeReference20Day, {
    positive: true,
  });

  const bullish = input.direction === "bullish";
  const priceAvailable = input.price !== null;
  const marketCapAvailable = input.marketCapBillions !== null;
  const ema20Available = priceAvailable && input.ema20 !== null;
  const ema50Available = priceAvailable && input.ema50 !== null;
  const macdAvailable = input.macdSignal !== null;
  const rsiAvailable = input.rsi !== null;
  const atrAvailable = input.atrPercent !== null;
  const adxAvailable = input.adx !== null;
  const volumeAvailable = input.averageVolumeMillions !== null;
  const proximityAvailable =
    priceAvailable && input.rangeReference20Day !== null;
  const proximityPercent = proximityAvailable
    ? bullish
      ? ((input.rangeReference20Day! - input.price!) /
          input.rangeReference20Day!) *
        100
      : ((input.price! - input.rangeReference20Day!) /
          input.rangeReference20Day!) *
        100
    : null;

  const components: EvidenceComponentResult[] = [
    component({
      available: priceAvailable,
      id: "price",
      label: "Price floor",
      observed: `$${formatNumber(input.price ?? 0)}`,
      passed: (input.price ?? 0) > 20,
      rule: "Price > $20",
    }),
    component({
      available: marketCapAvailable,
      id: "market_cap",
      label: "Market capitalization",
      observed: `$${formatNumber(input.marketCapBillions ?? 0)}B`,
      passed: (input.marketCapBillions ?? 0) > 5,
      rule: "Market capitalization > $5B",
    }),
    component({
      available: ema20Available,
      id: "ema_20",
      label: "20 EMA trend",
      observed: priceAvailable
        ? `Price $${formatNumber(input.price ?? 0)} vs. EMA $${formatNumber(input.ema20 ?? 0)}`
        : "",
      passed: bullish
        ? (input.price ?? 0) > (input.ema20 ?? 0)
        : (input.price ?? 0) < (input.ema20 ?? 0),
      rule: `Price ${bullish ? ">" : "<"} 20 EMA`,
    }),
    component({
      available: ema50Available,
      id: "ema_50",
      label: "50 EMA trend",
      observed: priceAvailable
        ? `Price $${formatNumber(input.price ?? 0)} vs. EMA $${formatNumber(input.ema50 ?? 0)}`
        : "",
      passed: bullish
        ? (input.price ?? 0) > (input.ema50 ?? 0)
        : (input.price ?? 0) < (input.ema50 ?? 0),
      rule: `Price ${bullish ? ">" : "<"} 50 EMA`,
    }),
    component({
      available: macdAvailable,
      id: "macd",
      label: "MACD direction",
      observed: input.macdSignal ?? "",
      passed: input.macdSignal === input.direction,
      rule: `MACD is ${input.direction}`,
    }),
    component({
      available: rsiAvailable,
      id: "rsi",
      label: "RSI range",
      observed: formatNumber(input.rsi ?? 0),
      passed: bullish
        ? (input.rsi ?? 0) >= 55 && (input.rsi ?? 0) <= 70
        : (input.rsi ?? 0) >= 30 && (input.rsi ?? 0) <= 45,
      rule: bullish ? "RSI from 55 through 70" : "RSI from 30 through 45",
    }),
    component({
      available: atrAvailable,
      id: "atr_percent",
      label: "ATR / price",
      observed: `${formatNumber(input.atrPercent ?? 0)}%`,
      passed: (input.atrPercent ?? 0) > 1.5,
      rule: "ATR as a percentage of price > 1.5%",
    }),
    component({
      available: adxAvailable,
      id: "adx",
      label: "Trend strength",
      observed: formatNumber(input.adx ?? 0),
      passed: (input.adx ?? 0) > 25,
      rule: "ADX > 25",
    }),
    component({
      available: volumeAvailable,
      id: "average_volume",
      label: "Average volume",
      observed: `${formatNumber(input.averageVolumeMillions ?? 0)}M shares`,
      passed: (input.averageVolumeMillions ?? 0) > 3,
      rule: "Average volume > 3M shares",
    }),
    component({
      available: proximityAvailable,
      id: "range_proximity",
      label: bullish ? "20-day high proximity" : "20-day low proximity",
      observed:
        proximityPercent === null
          ? ""
          : `${formatNumber(proximityPercent)}% ${bullish ? "below high" : "above low"}`,
      passed:
        proximityPercent !== null &&
        proximityPercent >= 0 &&
        proximityPercent <= 2,
      rule: `Price is within 2% of the 20-day ${bullish ? "high" : "low"}`,
    }),
  ];

  const evidenceAvailable = components.filter(
    ({ status }) => status !== "missing",
  ).length;
  const earnedPoints = components.reduce(
    (total, item) => total + item.earnedPoints,
    0,
  );
  const complete = evidenceAvailable === SETUP_ALIGNMENT_COMPONENT_COUNT;

  return {
    complete,
    completeness:
      (evidenceAvailable / SETUP_ALIGNMENT_COMPONENT_COUNT) * 100,
    components,
    earnedPoints,
    evidenceAvailable,
    evidenceRequired: SETUP_ALIGNMENT_COMPONENT_COUNT,
    score: complete ? earnedPoints : null,
    version: SETUP_ALIGNMENT_VERSION,
  };
}
