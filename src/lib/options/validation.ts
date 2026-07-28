import {
  calculateOptionIllustration,
  OptionInputError,
  STRATEGY_KINDS,
  type OptionIllustrationInput,
  type OptionLegInput,
  type PricingMode,
  type StrategyKind,
} from "@/lib/options/payoff";

const PRICING_MODES = ["midpoint", "natural", "manual"] as const;
const OPTION_TYPES = ["call", "put"] as const;
const LEG_SIDES = ["long", "short"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function parseLeg(value: unknown): OptionLegInput {
  if (!isRecord(value)) {
    throw new OptionInputError("Every saved option leg must be an object.");
  }

  const manualFill = value.manualFill;
  if (
    typeof value.ask !== "number" ||
    typeof value.bid !== "number" ||
    (manualFill !== null && typeof manualFill !== "number") ||
    typeof value.multiplier !== "number" ||
    !isOneOf(OPTION_TYPES, value.optionType) ||
    typeof value.quantity !== "number" ||
    !isOneOf(LEG_SIDES, value.side) ||
    typeof value.strike !== "number"
  ) {
    throw new OptionInputError("A saved option leg has invalid fields.");
  }

  return {
    ask: value.ask,
    bid: value.bid,
    manualFill,
    multiplier: value.multiplier,
    optionType: value.optionType,
    quantity: value.quantity,
    side: value.side,
    strike: value.strike,
  };
}

export function parseOptionIllustrationInput(
  value: unknown,
): OptionIllustrationInput {
  if (!isRecord(value) || !Array.isArray(value.legs)) {
    throw new OptionInputError("The option illustration payload is invalid.");
  }

  if (
    typeof value.estimatedFees !== "number" ||
    typeof value.expiry !== "string" ||
    !isOneOf(PRICING_MODES, value.pricingMode) ||
    (value.quoteTime !== null && typeof value.quoteTime !== "string") ||
    typeof value.spotPrice !== "number" ||
    !isOneOf(STRATEGY_KINDS, value.strategy) ||
    typeof value.symbol !== "string"
  ) {
    throw new OptionInputError("The option illustration fields are invalid.");
  }

  const input: OptionIllustrationInput = {
    estimatedFees: value.estimatedFees,
    expiry: value.expiry,
    legs: value.legs.map(parseLeg),
    pricingMode: value.pricingMode as PricingMode,
    quoteTime: value.quoteTime,
    spotPrice: value.spotPrice,
    strategy: value.strategy as StrategyKind,
    symbol: value.symbol.trim().toUpperCase(),
  };

  if (
    input.quoteTime !== null &&
    (input.quoteTime.length > 32 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(input.quoteTime))
  ) {
    throw new OptionInputError("The manual quote time is invalid.");
  }

  calculateOptionIllustration(input);
  return input;
}
