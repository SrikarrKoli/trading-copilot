import {
  expirationPnl,
  type OptionIllustration,
  type OptionIllustrationInput,
  type PayoffPoint,
} from "@/lib/options/payoff";

export const MAX_COMPARISON_ITEMS = 4;

export interface ComparisonItem {
  id: string;
  input: OptionIllustrationInput;
  label: string;
  result: OptionIllustration;
}

export interface ComparisonSeries {
  id: string;
  label: string;
  points: PayoffPoint[];
}

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.000001;
}

export function comparisonCompatibilityError(
  existing: ComparisonItem[],
  candidate: OptionIllustrationInput,
): string | null {
  if (existing.length >= MAX_COMPARISON_ITEMS) {
    return `A comparison can contain at most ${MAX_COMPARISON_ITEMS} illustrations.`;
  }

  const baseline = existing[0]?.input;
  if (!baseline) return null;

  if (
    baseline.symbol.trim().toUpperCase() !==
    candidate.symbol.trim().toUpperCase()
  ) {
    return "Compared illustrations must use the same underlying symbol.";
  }
  if (baseline.expiry !== candidate.expiry) {
    return "Compared illustrations must use the same expiration.";
  }
  if (!sameNumber(baseline.spotPrice, candidate.spotPrice)) {
    return "Compared illustrations must use the same entered spot price.";
  }

  return null;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values.map((value) => Number(value.toFixed(6))))].sort(
    (left, right) => left - right,
  );
}

export function buildComparisonSeries(
  items: ComparisonItem[],
  intervals = 60,
): ComparisonSeries[] {
  if (!items.length) return [];
  if (!Number.isInteger(intervals) || intervals < 2 || intervals > 500) {
    throw new Error("Comparison intervals must be a whole number from 2 to 500.");
  }

  const maximum = Math.max(
    1,
    ...items.flatMap(({ result }) =>
      result.chartPoints.map(({ underlyingPrice }) => underlyingPrice),
    ),
  );
  const generated = Array.from(
    { length: intervals + 1 },
    (_, index) => (maximum * index) / intervals,
  );
  const prices = uniqueSorted([
    ...generated,
    ...items.flatMap(({ input, result }) => [
      input.spotPrice,
      ...input.legs.map(({ strike }) => strike),
      ...result.breakEvens,
    ]),
  ]);

  return items.map(({ id, label, result }) => ({
    id,
    label,
    points: prices.map((underlyingPrice) => ({
      pnl: expirationPnl(
        result.legs,
        underlyingPrice,
        result.estimatedFees,
      ),
      underlyingPrice,
    })),
  }));
}
