"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  FlaskConical,
  Gauge,
  Plus,
  Scale,
} from "lucide-react";
import { useRef, useState } from "react";

import { StrategyComparison } from "@/components/strategy-comparison";
import {
  comparisonCompatibilityError,
  MAX_COMPARISON_ITEMS,
  type ComparisonItem,
} from "@/lib/options/comparison";
import {
  calculateOptionIllustration,
  OptionInputError,
  STRATEGY_KINDS,
  STRATEGY_META,
  type OptionIllustration,
  type OptionIllustrationInput,
  type PayoffPoint,
  type PricingMode,
  type StrategyKind,
} from "@/lib/options/payoff";

interface FormState {
  estimatedFees: string;
  expiry: string;
  longAsk: string;
  longBid: string;
  longManualFill: string;
  longStrike: string;
  multiplier: string;
  pricingMode: PricingMode;
  quantity: string;
  quoteTime: string;
  shortAsk: string;
  shortBid: string;
  shortManualFill: string;
  shortStrike: string;
  spotPrice: string;
  strategy: StrategyKind;
  symbol: string;
}

const initialFormState: FormState = {
  estimatedFees: "0",
  expiry: "",
  longAsk: "",
  longBid: "",
  longManualFill: "",
  longStrike: "",
  multiplier: "100",
  pricingMode: "midpoint",
  quantity: "1",
  quoteTime: "",
  shortAsk: "",
  shortBid: "",
  shortManualFill: "",
  shortStrike: "",
  spotPrice: "",
  strategy: "long_call",
  symbol: "",
};

function toNumber(value: string): number {
  return value.trim().length ? Number(value) : Number.NaN;
}

function optionalNumber(value: string): number | null {
  return value.trim().length ? Number(value) : null;
}

function buildInput(state: FormState): OptionIllustrationInput {
  const usesCalls =
    state.strategy === "long_call" ||
    state.strategy === "bull_call_debit_spread";
  const usesSpread =
    state.strategy === "bull_call_debit_spread" ||
    state.strategy === "bear_put_debit_spread";
  const quantity = toNumber(state.quantity);
  const multiplier = toNumber(state.multiplier);
  const optionType: "call" | "put" = usesCalls ? "call" : "put";

  return {
    estimatedFees: toNumber(state.estimatedFees),
    expiry: state.expiry,
    legs: [
      {
        ask: toNumber(state.longAsk),
        bid: toNumber(state.longBid),
        manualFill: optionalNumber(state.longManualFill),
        multiplier,
        optionType,
        quantity,
        side: "long",
        strike: toNumber(state.longStrike),
      },
      ...(usesSpread
        ? [
            {
              ask: toNumber(state.shortAsk),
              bid: toNumber(state.shortBid),
              manualFill: optionalNumber(state.shortManualFill),
              multiplier,
              optionType,
              quantity,
              side: "short" as const,
              strike: toNumber(state.shortStrike),
            },
          ]
        : []),
    ],
    pricingMode: state.pricingMode,
    quoteTime: state.quoteTime || null,
    spotPrice: toNumber(state.spotPrice),
    strategy: state.strategy,
    symbol: state.symbol,
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatQuoteTime(value: string | null): string {
  if (!value) return "not supplied";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function PayoffChart({
  breakEvens,
  points,
  spotPrice,
}: {
  breakEvens: number[];
  points: PayoffPoint[];
  spotPrice: number;
}) {
  const width = 900;
  const height = 320;
  const padding = { bottom: 42, left: 70, right: 24, top: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMinimum = 0;
  const xMaximum = Math.max(...points.map(({ underlyingPrice }) => underlyingPrice));
  const rawYMinimum = Math.min(0, ...points.map(({ pnl }) => pnl));
  const rawYMaximum = Math.max(0, ...points.map(({ pnl }) => pnl));
  const yPadding = Math.max((rawYMaximum - rawYMinimum) * 0.08, 1);
  const yMinimum = rawYMinimum - yPadding;
  const yMaximum = rawYMaximum + yPadding;
  const xScale = (value: number) =>
    padding.left + ((value - xMinimum) / (xMaximum - xMinimum)) * plotWidth;
  const yScale = (value: number) =>
    padding.top + ((yMaximum - value) / (yMaximum - yMinimum)) * plotHeight;
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xScale(point.underlyingPrice).toFixed(2)} ${yScale(point.pnl).toFixed(2)}`,
    )
    .join(" ");
  const xTicks = Array.from({ length: 5 }, (_, index) =>
    (xMaximum * index) / 4,
  );
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    yMinimum + ((yMaximum - yMinimum) * index) / 4,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background p-3">
      <svg
        aria-label="Expiration profit and loss chart"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="payoff-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#7aa7ff" />
            <stop offset="100%" stopColor="#7cdbb5" />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#252d39"
              strokeWidth="1"
            />
            <text
              fill="#8c96a6"
              fontSize="10"
              textAnchor="end"
              x={padding.left - 10}
              y={yScale(tick) + 3}
            >
              {formatMoney(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="#1b222d"
              strokeWidth="1"
            />
            <text
              fill="#8c96a6"
              fontSize="10"
              textAnchor="middle"
              x={xScale(tick)}
              y={height - 16}
            >
              ${formatPrice(tick)}
            </text>
          </g>
        ))}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="#f3f5f7"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <line
          x1={xScale(spotPrice)}
          x2={xScale(spotPrice)}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="#f7c86f"
          strokeDasharray="5 5"
          strokeOpacity="0.8"
        />
        {breakEvens.map((breakEven) => (
          <line
            key={breakEven}
            x1={xScale(breakEven)}
            x2={xScale(breakEven)}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#7cdbb5"
            strokeDasharray="3 5"
            strokeOpacity="0.8"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke="url(#payoff-line)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <text
          fill="#f7c86f"
          fontSize="10"
          textAnchor="middle"
          x={xScale(spotPrice)}
          y={padding.top - 8}
        >
          Spot
        </text>
      </svg>
      <div className="flex flex-wrap gap-4 px-2 pb-1 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" />
          Entered spot
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" />
          Break-even
        </span>
        <span>Horizontal line = $0 expiration P/L</span>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  min = "0",
  name,
  onChange,
  placeholder,
  step = "0.01",
  value,
}: {
  label: string;
  min?: string;
  name: keyof FormState;
  onChange: (name: keyof FormState, value: string) => void;
  placeholder?: string;
  step?: string;
  value: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required
        step={step}
        value={value}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm placeholder:text-muted/60"
      />
    </label>
  );
}

function LegInputs({
  manualPricing,
  onChange,
  prefix,
  side,
  state,
}: {
  manualPricing: boolean;
  onChange: (name: keyof FormState, value: string) => void;
  prefix: "long" | "short";
  side: string;
  state: FormState;
}) {
  const strike = `${prefix}Strike` as keyof FormState;
  const bid = `${prefix}Bid` as keyof FormState;
  const ask = `${prefix}Ask` as keyof FormState;
  const manualFill = `${prefix}ManualFill` as keyof FormState;

  return (
    <fieldset className="rounded-xl border border-border bg-white/[0.018] p-4">
      <legend className="px-2 text-xs font-semibold">{side}</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput
          label="Strike"
          name={strike}
          onChange={onChange}
          placeholder="100.00"
          value={state[strike]}
        />
        <NumberInput
          label="Bid"
          name={bid}
          onChange={onChange}
          placeholder="4.80"
          value={state[bid]}
        />
        <NumberInput
          label="Ask"
          name={ask}
          onChange={onChange}
          placeholder="5.20"
          value={state[ask]}
        />
      </div>
      {manualPricing ? (
        <div className="mt-4">
          <NumberInput
            label="Selected manual fill"
            name={manualFill}
            onChange={onChange}
            placeholder="5.00"
            value={state[manualFill]}
          />
        </div>
      ) : null}
    </fieldset>
  );
}

function Results({
  addButtonLabel,
  addDisabled,
  input,
  onAddToComparison,
  result,
}: {
  addButtonLabel: string;
  addDisabled: boolean;
  input: OptionIllustrationInput;
  onAddToComparison: () => void;
  result: OptionIllustration;
}) {
  const finiteMaxProfit =
    result.maxProfit === "unbounded" ? null : result.maxProfit;
  const riskReward =
    finiteMaxProfit !== null && result.maxLoss > 0
      ? finiteMaxProfit / result.maxLoss
      : null;

  return (
    <section aria-label="Payoff results" className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {[
          ["Net debit", formatMoney(result.netDebit)],
          ["Est. entry capital", formatMoney(result.totalEntryCost)],
          ["Maximum loss", formatMoney(result.maxLoss)],
          [
            "Maximum profit",
            result.maxProfit === "unbounded"
              ? "Unbounded"
              : formatMoney(result.maxProfit),
          ],
          [
            "Break-even",
            result.breakEvens.length
              ? result.breakEvens
                  .map((value) => `$${formatPrice(value)}`)
                  .join(", ")
              : "None",
          ],
          ["Expected move", "Unavailable"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-4 py-4"
          >
            <p className="font-mono text-lg font-semibold">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      <article className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gauge aria-hidden="true" className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">
                Expiration payoff illustration
              </h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {input.symbol.toUpperCase()} ·{" "}
              {STRATEGY_META[input.strategy].label} · expiry {input.expiry}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <div className="text-left sm:text-right">
              <p className="font-mono text-xs text-muted">
                Engine v{result.engineVersion}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted">
                Manual quote · {formatQuoteTime(input.quoteTime)}
              </p>
            </div>
            <button
              type="button"
              disabled={addDisabled}
              onClick={onAddToComparison}
              className="inline-flex items-center gap-2 rounded-lg border border-[#9bbaff]/25 bg-[#9bbaff]/8 px-3 py-2 text-xs font-medium text-[#b7ccff] transition hover:bg-[#9bbaff]/12 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              {addButtonLabel}
            </button>
          </div>
        </div>
        <div className="mt-5">
          <PayoffChart
            breakEvens={result.breakEvens}
            points={result.chartPoints}
            spotPrice={input.spotPrice}
          />
        </div>
      </article>

      <div className="grid gap-5 2xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Leg pricing</h2>
            <p className="mt-1 text-xs text-muted">
              Premiums are per share; position amounts use quantity ×
              multiplier.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-border text-[10px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Leg</th>
                  <th className="px-3 py-3 font-medium">Strike</th>
                  <th className="px-3 py-3 font-medium">Bid</th>
                  <th className="px-3 py-3 font-medium">Ask</th>
                  <th className="px-3 py-3 font-medium">Mid</th>
                  <th className="px-5 py-3 font-medium">Fill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.legs.map((leg) => (
                  <tr key={`${leg.side}-${leg.strike}`}>
                    <td className="px-5 py-3 capitalize">
                      {leg.side} {leg.optionType}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      ${formatPrice(leg.strike)}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      ${formatPrice(leg.bid)}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      ${formatPrice(leg.ask)}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      ${formatPrice(leg.midpoint)}
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-accent">
                      ${formatPrice(leg.selectedFill)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
            {[
              ["Quantity", input.legs[0]?.quantity ?? 0],
              ["Multiplier", input.legs[0]?.multiplier ?? 0],
              ["Est. fees", formatMoney(result.estimatedFees)],
              [
                "Risk / reward",
                riskReward === null ? "Not finite" : `${riskReward.toFixed(2)}×`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-4 py-3">
                <p className="font-mono text-sm font-semibold">{value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Expiration scenarios</h2>
            <p className="mt-1 text-xs text-muted">
              Includes the entered fees and selected fill assumptions.
            </p>
          </header>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Underlying</th>
                  <th className="px-5 py-3 text-right font-medium">
                    Expiration P/L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.scenarioPoints.map((point) => (
                  <tr key={point.underlyingPrice}>
                    <td className="px-5 py-3 font-mono">
                      ${formatPrice(point.underlyingPrice)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono font-semibold ${
                        point.pnl > 0
                          ? "text-accent"
                          : point.pnl < 0
                            ? "text-danger"
                            : "text-muted"
                      }`}
                    >
                      {formatMoney(point.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-warning/20 bg-warning/[0.055] p-5">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle aria-hidden="true" className="size-4" />
          <h2 className="text-sm font-semibold">Model limits</h2>
        </div>
        <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#e9d2a0]">
          {result.warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function StrategyLab() {
  const [state, setState] = useState(initialFormState);
  const [result, setResult] = useState<OptionIllustration | null>(null);
  const [calculatedInput, setCalculatedInput] =
    useState<OptionIllustrationInput | null>(null);
  const [error, setError] = useState("");
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparisonError, setComparisonError] = useState("");
  const [currentComparisonItemId, setCurrentComparisonItemId] = useState<
    string | null
  >(null);
  const comparisonSequence = useRef(1);
  const usesSpread =
    state.strategy === "bull_call_debit_spread" ||
    state.strategy === "bear_put_debit_spread";
  const optionType =
    state.strategy === "long_call" ||
    state.strategy === "bull_call_debit_spread"
      ? "call"
      : "put";
  const strategyMeta = STRATEGY_META[state.strategy];
  const DirectionIcon =
    strategyMeta.direction === "bullish" ? ArrowUpRight : ArrowDownRight;

  const onChange = (name: keyof FormState, value: string) => {
    setState((current) => ({ ...current, [name]: value }));
  };

  const pricingDescription =
    state.pricingMode === "midpoint"
      ? "Each selected fill is the entered bid/ask midpoint."
      : state.pricingMode === "natural"
        ? "Long legs use ask; short legs use bid."
        : "Each leg uses the manual fill you enter.";

  const calculate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const input = buildInput(state);
      const illustration = calculateOptionIllustration(input);
      setCalculatedInput(input);
      setResult(illustration);
      setError("");
      setCurrentComparisonItemId(null);
    } catch (caught) {
      setResult(null);
      setCalculatedInput(null);
      setError(
        caught instanceof OptionInputError
          ? caught.message
          : "The payoff could not be calculated from these inputs.",
      );
    }
  };

  const addToComparison = () => {
    if (!calculatedInput || !result) return;
    const compatibilityError = comparisonCompatibilityError(
      comparisonItems,
      calculatedInput,
    );
    if (compatibilityError) {
      setComparisonError(compatibilityError);
      return;
    }

    const id = `comparison-${comparisonSequence.current}`;
    comparisonSequence.current += 1;
    const strikes = calculatedInput.legs
      .map(({ strike }) => formatPrice(strike))
      .join("/");
    const item: ComparisonItem = {
      id,
      input: calculatedInput,
      label: `${STRATEGY_META[calculatedInput.strategy].label} ${strikes}`,
      result,
    };
    setComparisonItems((current) => [...current, item]);
    setCurrentComparisonItemId(id);
    setComparisonError("");
  };

  const removeComparisonItem = (id: string) => {
    setComparisonItems((current) => current.filter((item) => item.id !== id));
    if (currentComparisonItemId === id) {
      setCurrentComparisonItemId(null);
    }
    setComparisonError("");
  };

  const clearComparison = () => {
    setComparisonItems([]);
    setCurrentComparisonItemId(null);
    setComparisonError("");
  };

  const comparisonFull = comparisonItems.length >= MAX_COMPARISON_ITEMS;
  const addButtonLabel = currentComparisonItemId
    ? "Added to comparison"
    : comparisonFull
      ? "Comparison full"
      : "Add to comparison";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
      <form
        onSubmit={calculate}
        className="rounded-2xl border border-border bg-card p-5 xl:sticky xl:top-6"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#7aa7ff]/10 text-[#9bbaff]">
            <Scale aria-hidden="true" className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Manual contract inputs</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Nothing here is saved or sent to a broker.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Strategy
            </span>
            <select
              name="strategy"
              onChange={(event) =>
                onChange("strategy", event.target.value as StrategyKind)
              }
              value={state.strategy}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              {STRATEGY_KINDS.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {STRATEGY_META[strategy].label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <DirectionIcon
                aria-hidden="true"
                className={`size-3.5 ${
                  strategyMeta.direction === "bullish"
                    ? "text-accent"
                    : "text-danger"
                }`}
              />
              <p className="text-xs font-medium capitalize">
                {strategyMeta.direction} illustration
              </p>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-muted">
              {strategyMeta.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label>
              <span className="mb-2 block text-xs font-medium text-muted">
                Underlying symbol
              </span>
              <input
                name="symbol"
                onChange={(event) => onChange("symbol", event.target.value)}
                placeholder="AAPL"
                required
                value={state.symbol}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm uppercase placeholder:font-sans placeholder:text-muted/60"
              />
            </label>
            <NumberInput
              label="Current underlying price"
              name="spotPrice"
              onChange={onChange}
              placeholder="100.00"
              value={state.spotPrice}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label>
              <span className="mb-2 block text-xs font-medium text-muted">
                Expiration
              </span>
              <input
                type="date"
                name="expiry"
                onChange={(event) => onChange("expiry", event.target.value)}
                required
                value={state.expiry}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium text-muted">
                Manual quote time
              </span>
              <input
                type="datetime-local"
                name="quoteTime"
                onChange={(event) => onChange("quoteTime", event.target.value)}
                value={state.quoteTime}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <NumberInput
              label="Contracts"
              min="1"
              name="quantity"
              onChange={onChange}
              step="1"
              value={state.quantity}
            />
            <NumberInput
              label="Contract multiplier"
              min="1"
              name="multiplier"
              onChange={onChange}
              step="1"
              value={state.multiplier}
            />
          </div>

          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Pricing assumption
            </span>
            <select
              name="pricingMode"
              onChange={(event) =>
                onChange("pricingMode", event.target.value as PricingMode)
              }
              value={state.pricingMode}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              <option value="midpoint">Midpoint</option>
              <option value="natural">Natural</option>
              <option value="manual">Manual fill</option>
            </select>
            <span className="mt-1.5 block text-[10px] leading-4 text-muted">
              {pricingDescription}
            </span>
          </label>

          <LegInputs
            manualPricing={state.pricingMode === "manual"}
            onChange={onChange}
            prefix="long"
            side={`Long ${optionType}`}
            state={state}
          />
          {usesSpread ? (
            <LegInputs
              manualPricing={state.pricingMode === "manual"}
              onChange={onChange}
              prefix="short"
              side={`Short ${optionType}`}
              state={state}
            />
          ) : null}

          <NumberInput
            label="Estimated total fees"
            name="estimatedFees"
            onChange={onChange}
            value={state.estimatedFees}
          />

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong"
          >
            <Calculator aria-hidden="true" className="size-4" />
            Calculate expiration payoff
          </button>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-xs leading-5 text-danger"
          >
            {error}
          </p>
        ) : null}
      </form>

      <div>
        {result && calculatedInput ? (
          <Results
            addButtonLabel={addButtonLabel}
            addDisabled={Boolean(currentComparisonItemId) || comparisonFull}
            input={calculatedInput}
            onAddToComparison={addToComparison}
            result={result}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <FlaskConical
              aria-hidden="true"
              className="mx-auto size-7 text-muted"
            />
            <h2 className="mt-4 text-base font-semibold">
              Build an expiration illustration
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted">
              Enter manual contract quotes and assumptions. The engine will
              calculate position payoff without live data, AI, or broker
              connectivity.
            </p>
          </div>
        )}
        <div className="mt-6">
          <StrategyComparison
            error={comparisonError}
            items={comparisonItems}
            onClear={clearComparison}
            onRemove={removeComparisonItem}
          />
        </div>
      </div>
    </div>
  );
}
