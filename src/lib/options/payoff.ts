export const OPTION_ENGINE_VERSION = "1.0.0";

export const STRATEGY_KINDS = [
  "long_call",
  "long_put",
  "bull_call_debit_spread",
  "bear_put_debit_spread",
] as const;

export type StrategyKind = (typeof STRATEGY_KINDS)[number];
export type OptionType = "call" | "put";
export type LegSide = "long" | "short";
export type PricingMode = "midpoint" | "natural" | "manual";

export interface OptionLegInput {
  ask: number;
  bid: number;
  manualFill: number | null;
  multiplier: number;
  optionType: OptionType;
  quantity: number;
  side: LegSide;
  strike: number;
}

export interface OptionIllustrationInput {
  estimatedFees: number;
  expiry: string;
  legs: OptionLegInput[];
  pricingMode: PricingMode;
  quoteTime: string | null;
  spotPrice: number;
  strategy: StrategyKind;
  symbol: string;
}

export interface PricedOptionLeg extends OptionLegInput {
  midpoint: number;
  selectedFill: number;
}

export interface PayoffPoint {
  pnl: number;
  underlyingPrice: number;
}

export interface OptionIllustration {
  breakEvens: number[];
  chartPoints: PayoffPoint[];
  engineVersion: string;
  estimatedFees: number;
  legs: PricedOptionLeg[];
  maxLoss: number;
  maxProfit: number | "unbounded";
  netDebit: number;
  scenarioPoints: PayoffPoint[];
  totalEntryCost: number;
  warnings: string[];
}

export const STRATEGY_META: Record<
  StrategyKind,
  {
    description: string;
    direction: "bullish" | "bearish";
    label: string;
  }
> = {
  long_call: {
    description: "Long one call with uncapped expiration upside.",
    direction: "bullish",
    label: "Long call",
  },
  long_put: {
    description: "Long one put with downside exposure bounded at zero.",
    direction: "bearish",
    label: "Long put",
  },
  bull_call_debit_spread: {
    description: "Long a lower-strike call and short a higher-strike call.",
    direction: "bullish",
    label: "Bull call debit spread",
  },
  bear_put_debit_spread: {
    description: "Long a higher-strike put and short a lower-strike put.",
    direction: "bearish",
    label: "Bear put debit spread",
  },
};

export class OptionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptionInputError";
  }
}

function assertFiniteInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new OptionInputError(`${label} is outside the supported range.`);
  }
}

function validateLeg(leg: OptionLegInput, index: number) {
  const label = `Leg ${index + 1}`;
  assertFiniteInRange(leg.strike, 0.01, 1_000_000, `${label} strike`);
  assertFiniteInRange(leg.bid, 0, 1_000_000, `${label} bid`);
  assertFiniteInRange(leg.ask, 0, 1_000_000, `${label} ask`);
  assertFiniteInRange(leg.quantity, 1, 1_000, `${label} quantity`);
  assertFiniteInRange(leg.multiplier, 1, 10_000, `${label} multiplier`);

  if (!Number.isInteger(leg.quantity) || !Number.isInteger(leg.multiplier)) {
    throw new OptionInputError(
      `${label} quantity and multiplier must be whole numbers.`,
    );
  }
  if (leg.ask < leg.bid) {
    throw new OptionInputError(`${label} ask cannot be below its bid.`);
  }
  if (
    leg.manualFill !== null &&
    (!Number.isFinite(leg.manualFill) ||
      leg.manualFill < 0 ||
      leg.manualFill > 1_000_000)
  ) {
    throw new OptionInputError(`${label} manual fill is invalid.`);
  }
}

function validateStructure(input: OptionIllustrationInput) {
  const [first, second] = input.legs;
  const expectedLegs =
    input.strategy === "long_call" || input.strategy === "long_put" ? 1 : 2;

  if (input.legs.length !== expectedLegs || !first) {
    throw new OptionInputError(
      `${STRATEGY_META[input.strategy].label} requires ${expectedLegs} leg${expectedLegs === 1 ? "" : "s"}.`,
    );
  }

  const expectedType: OptionType =
    input.strategy === "long_call" ||
    input.strategy === "bull_call_debit_spread"
      ? "call"
      : "put";

  if (first.side !== "long" || first.optionType !== expectedType) {
    throw new OptionInputError(
      `${STRATEGY_META[input.strategy].label} requires the expected long ${expectedType} leg.`,
    );
  }

  if (expectedLegs === 2) {
    if (
      !second ||
      second.side !== "short" ||
      second.optionType !== expectedType
    ) {
      throw new OptionInputError(
        `${STRATEGY_META[input.strategy].label} requires the expected short ${expectedType} leg.`,
      );
    }
    if (
      first.quantity !== second.quantity ||
      first.multiplier !== second.multiplier
    ) {
      throw new OptionInputError(
        "Vertical-spread legs must use equal quantities and multipliers.",
      );
    }
    if (
      input.strategy === "bull_call_debit_spread" &&
      first.strike >= second.strike
    ) {
      throw new OptionInputError(
        "A bull call spread needs a long strike below the short strike.",
      );
    }
    if (
      input.strategy === "bear_put_debit_spread" &&
      first.strike <= second.strike
    ) {
      throw new OptionInputError(
        "A bear put spread needs a long strike above the short strike.",
      );
    }
  }
}

function selectedFill(leg: OptionLegInput, mode: PricingMode): number {
  if (mode === "midpoint") return (leg.bid + leg.ask) / 2;
  if (mode === "natural") return leg.side === "long" ? leg.ask : leg.bid;
  if (leg.manualFill === null) {
    throw new OptionInputError(
      "Every leg needs a manual fill when manual pricing is selected.",
    );
  }
  return leg.manualFill;
}

function intrinsicValue(
  optionType: OptionType,
  strike: number,
  underlyingPrice: number,
): number {
  return optionType === "call"
    ? Math.max(underlyingPrice - strike, 0)
    : Math.max(strike - underlyingPrice, 0);
}

export function expirationPnl(
  legs: PricedOptionLeg[],
  underlyingPrice: number,
  estimatedFees: number,
): number {
  const legPnl = legs.reduce((total, leg) => {
    const intrinsic = intrinsicValue(
      leg.optionType,
      leg.strike,
      underlyingPrice,
    );
    const perShare =
      leg.side === "long"
        ? intrinsic - leg.selectedFill
        : leg.selectedFill - intrinsic;
    return total + perShare * leg.quantity * leg.multiplier;
  }, 0);

  return legPnl - estimatedFees;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values.map((value) => Number(value.toFixed(6))))].sort(
    (left, right) => left - right,
  );
}

function buildPriceGrid(
  input: OptionIllustrationInput,
  breakEvens: number[],
  intervals: number,
): number[] {
  const strikes = input.legs.map(({ strike }) => strike);
  const maximum = Math.max(
    input.spotPrice * 1.6,
    Math.max(...strikes) * 1.5,
    ...breakEvens.map((value) => value * 1.25),
    1,
  );
  const generated = Array.from(
    { length: intervals + 1 },
    (_, index) => (maximum * index) / intervals,
  );
  return uniqueSorted([
    ...generated,
    ...strikes,
    ...breakEvens,
    input.spotPrice,
  ]);
}

function payoffPoints(
  prices: number[],
  legs: PricedOptionLeg[],
  estimatedFees: number,
): PayoffPoint[] {
  return prices.map((underlyingPrice) => ({
    pnl: expirationPnl(legs, underlyingPrice, estimatedFees),
    underlyingPrice,
  }));
}

function getRiskMetrics(
  input: OptionIllustrationInput,
  pricedLegs: PricedOptionLeg[],
  totalEntryCost: number,
): Pick<OptionIllustration, "breakEvens" | "maxLoss" | "maxProfit"> {
  const [longLeg, shortLeg] = pricedLegs;
  if (!longLeg) {
    throw new OptionInputError("At least one priced leg is required.");
  }
  const contractShares = longLeg.quantity * longLeg.multiplier;
  const effectiveDebitPerShare = totalEntryCost / contractShares;

  if (input.strategy === "long_call") {
    return {
      breakEvens: [longLeg.strike + effectiveDebitPerShare],
      maxLoss: totalEntryCost,
      maxProfit: "unbounded",
    };
  }

  if (input.strategy === "long_put") {
    const breakEven = longLeg.strike - effectiveDebitPerShare;
    return {
      breakEvens: breakEven >= 0 ? [breakEven] : [],
      maxLoss: totalEntryCost,
      maxProfit: longLeg.strike * contractShares - totalEntryCost,
    };
  }

  if (!shortLeg) {
    throw new OptionInputError("A vertical spread requires two priced legs.");
  }
  const width = Math.abs(longLeg.strike - shortLeg.strike);
  const spreadMaximum = width * contractShares - totalEntryCost;

  if (input.strategy === "bull_call_debit_spread") {
    const breakEven = longLeg.strike + effectiveDebitPerShare;
    return {
      breakEvens:
        breakEven <= shortLeg.strike ? [Math.max(0, breakEven)] : [],
      maxLoss: totalEntryCost,
      maxProfit: spreadMaximum,
    };
  }

  const breakEven = longLeg.strike - effectiveDebitPerShare;
  return {
    breakEvens:
      breakEven >= shortLeg.strike ? [Math.max(0, breakEven)] : [],
    maxLoss: totalEntryCost,
    maxProfit: spreadMaximum,
  };
}

export function calculateOptionIllustration(
  input: OptionIllustrationInput,
): OptionIllustration {
  const symbol = input.symbol.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]{0,31}$/.test(symbol)) {
    throw new OptionInputError("Enter a valid underlying symbol.");
  }
  if (!input.expiry || Number.isNaN(Date.parse(`${input.expiry}T00:00:00`))) {
    throw new OptionInputError("Enter a valid expiration date.");
  }
  assertFiniteInRange(input.spotPrice, 0.01, 1_000_000, "Spot price");
  assertFiniteInRange(input.estimatedFees, 0, 1_000_000, "Estimated fees");
  input.legs.forEach(validateLeg);
  validateStructure(input);

  const legs = input.legs.map((leg) => ({
    ...leg,
    midpoint: (leg.bid + leg.ask) / 2,
    selectedFill: selectedFill(leg, input.pricingMode),
  }));
  const netDebit = legs.reduce(
    (total, leg) =>
      total +
      (leg.side === "long" ? 1 : -1) *
        leg.selectedFill *
        leg.quantity *
        leg.multiplier,
    0,
  );
  if (netDebit <= 0) {
    throw new OptionInputError(
      "This debit-strategy slice requires a positive net debit.",
    );
  }

  const totalEntryCost = netDebit + input.estimatedFees;
  const metrics = getRiskMetrics(input, legs, totalEntryCost);
  const warnings = [
    "Expiration payoff can differ materially from pre-expiration value.",
    "American-style exercise, assignment, dividends, and event gaps are not modeled.",
    "Expected move is unavailable without a sourced volatility input.",
    "No probability, volatility, Greek, buying-power, tax, or broker-margin claim is calculated.",
  ];

  if (!input.quoteTime) {
    warnings.unshift("Manual quote time is missing; freshness cannot be assessed.");
  }
  if (new Date(`${input.expiry}T23:59:59`).getTime() < Date.now()) {
    warnings.unshift("The selected expiration date is in the past.");
  }
  if (
    input.pricingMode === "manual" &&
    legs.some(
      ({ ask, bid, selectedFill: fill }) => fill < bid || fill > ask,
    )
  ) {
    warnings.unshift("At least one manual fill is outside its entered bid/ask.");
  }
  if (metrics.breakEvens.length === 0) {
    warnings.unshift(
      "The entered debit and fees leave no non-negative expiration break-even.",
    );
  }
  if (metrics.maxProfit !== "unbounded" && metrics.maxProfit < 0) {
    warnings.unshift(
      "The entered debit and fees make every modeled expiration outcome negative.",
    );
  }

  const chartPrices = buildPriceGrid(input, metrics.breakEvens, 60);
  const scenarioPrices = buildPriceGrid(input, metrics.breakEvens, 8);

  return {
    ...metrics,
    chartPoints: payoffPoints(chartPrices, legs, input.estimatedFees),
    engineVersion: OPTION_ENGINE_VERSION,
    estimatedFees: input.estimatedFees,
    legs,
    netDebit,
    scenarioPoints: payoffPoints(
      scenarioPrices,
      legs,
      input.estimatedFees,
    ),
    totalEntryCost,
    warnings,
  };
}
