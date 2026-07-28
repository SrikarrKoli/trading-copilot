"use client";

import { GitCompareArrows, Trash2, X } from "lucide-react";

import {
  buildComparisonSeries,
  MAX_COMPARISON_ITEMS,
  type ComparisonItem,
} from "@/lib/options/comparison";
import { STRATEGY_META } from "@/lib/options/payoff";

const SERIES_COLORS = ["#7cdbb5", "#9bbaff", "#f7c86f", "#ff9f7b"];

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
  if (!value) return "Not supplied";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function legDescription(item: ComparisonItem): string {
  return item.result.legs
    .map(
      ({ optionType, side, strike }) =>
        `${side === "long" ? "+" : "−"}${formatPrice(strike)} ${optionType[0]?.toUpperCase()}`,
    )
    .join(" / ");
}

function riskReward(item: ComparisonItem): string {
  if (item.result.maxProfit === "unbounded") return "Not finite";
  if (item.result.maxLoss <= 0) return "Unavailable";
  return `${(item.result.maxProfit / item.result.maxLoss).toFixed(2)}×`;
}

function ComparisonChart({ items }: { items: ComparisonItem[] }) {
  const series = buildComparisonSeries(items);
  const width = 960;
  const height = 340;
  const padding = { bottom: 44, left: 72, right: 26, top: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const allPoints = series.flatMap(({ points }) => points);
  const xMaximum = Math.max(
    1,
    ...allPoints.map(({ underlyingPrice }) => underlyingPrice),
  );
  const rawYMinimum = Math.min(0, ...allPoints.map(({ pnl }) => pnl));
  const rawYMaximum = Math.max(0, ...allPoints.map(({ pnl }) => pnl));
  const yPadding = Math.max((rawYMaximum - rawYMinimum) * 0.08, 1);
  const yMinimum = rawYMinimum - yPadding;
  const yMaximum = rawYMaximum + yPadding;
  const xScale = (value: number) =>
    padding.left + (value / xMaximum) * plotWidth;
  const yScale = (value: number) =>
    padding.top + ((yMaximum - value) / (yMaximum - yMinimum)) * plotHeight;
  const xTicks = Array.from({ length: 5 }, (_, index) =>
    (xMaximum * index) / 4,
  );
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    yMinimum + ((yMaximum - yMinimum) * index) / 4,
  );
  const spotPrice = items[0]?.input.spotPrice ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background p-3">
      <svg
        aria-label="Compared expiration profit and loss curves"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
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
          strokeOpacity="0.65"
        />
        {series.map(({ id, points }, index) => {
          const path = points
            .map(
              (point, pointIndex) =>
                `${pointIndex === 0 ? "M" : "L"} ${xScale(point.underlyingPrice).toFixed(2)} ${yScale(point.pnl).toFixed(2)}`,
            )
            .join(" ");
          return (
            <path
              key={id}
              d={path}
              fill="none"
              stroke={SERIES_COLORS[index]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.5"
            />
          );
        })}
        <text
          fill="#f7c86f"
          fontSize="10"
          textAnchor="middle"
          x={xScale(spotPrice)}
          y={padding.top - 9}
        >
          Spot
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-2 px-2 pb-1 text-[10px] text-muted">
        {items.map((item, index) => (
          <span key={item.id} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[index] }}
            />
            {item.label}
          </span>
        ))}
        <span>Shared axis · horizontal line = $0 expiration P/L</span>
      </div>
    </div>
  );
}

function metricRows(items: ComparisonItem[]) {
  return [
    {
      label: "Strategy",
      values: items.map(({ input }) => STRATEGY_META[input.strategy].label),
    },
    { label: "Legs", values: items.map(legDescription) },
    {
      label: "Pricing",
      values: items.map(({ input }) => input.pricingMode),
    },
    {
      label: "Quote time",
      values: items.map(({ input }) => formatQuoteTime(input.quoteTime)),
    },
    {
      label: "Net debit",
      values: items.map(({ result }) => formatMoney(result.netDebit)),
    },
    {
      label: "Est. entry capital",
      values: items.map(({ result }) => formatMoney(result.totalEntryCost)),
    },
    {
      label: "Maximum loss",
      values: items.map(({ result }) => formatMoney(result.maxLoss)),
    },
    {
      label: "Maximum profit",
      values: items.map(({ result }) =>
        result.maxProfit === "unbounded"
          ? "Unbounded"
          : formatMoney(result.maxProfit),
      ),
    },
    {
      label: "Break-even",
      values: items.map(({ result }) =>
        result.breakEvens.length
          ? result.breakEvens
              .map((breakEven) => `$${formatPrice(breakEven)}`)
              .join(", ")
          : "None",
      ),
    },
    {
      label: "Risk / reward",
      values: items.map(riskReward),
    },
  ];
}

export function StrategyComparison({
  error,
  items,
  onClear,
  onRemove,
}: {
  error: string;
  items: ComparisonItem[];
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
        <GitCompareArrows
          aria-hidden="true"
          className="mx-auto size-6 text-muted"
        />
        <h2 className="mt-4 text-sm font-semibold">Comparison set is empty</h2>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted">
          Calculate an illustration and add it here. Up to{" "}
          {MAX_COMPARISON_ITEMS} structures can share one underlying, spot
          price, and expiration.
        </p>
        {error ? (
          <p className="mt-3 text-xs text-danger" aria-live="polite">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  const baseline = items[0]!.input;
  const rows = metricRows(items);

  return (
    <section
      aria-label="Strategy comparison"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitCompareArrows
              aria-hidden="true"
              className="size-4 text-[#9bbaff]"
            />
            <h2 className="text-sm font-semibold">
              Side-by-side expiration comparison
            </h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            {baseline.symbol.toUpperCase()} at ${formatPrice(baseline.spotPrice)}
            {" · "}
            expiry {baseline.expiry}
            {" · "}
            {items.length}/{MAX_COMPARISON_ITEMS} illustrations
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:border-danger/30 hover:text-danger"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Clear comparison
        </button>
      </header>

      {error ? (
        <p
          aria-live="polite"
          className="border-b border-danger/20 bg-danger/8 px-5 py-3 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 2xl:grid-cols-4">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: SERIES_COLORS[index] }}
                  />
                  <h3 className="text-xs font-semibold">{item.label}</h3>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted">
                  {legDescription(item)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${item.label}`}
                onClick={() => onRemove(item.id)}
                className="rounded-md p-1.5 text-muted transition hover:bg-white/[0.05] hover:text-danger"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
            <p className="mt-3 font-mono text-sm font-semibold">
              {formatMoney(item.result.maxLoss)}
            </p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted">
              maximum loss
            </p>
          </article>
        ))}
      </div>

      <div className="p-5">
        <ComparisonChart items={items} />
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-border bg-background/50 text-[10px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Metric</th>
              {items.map((item) => (
                <th key={item.id} className="px-4 py-3 font-medium">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-muted">
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td
                    key={`${items[index]?.id}-${row.label}`}
                    className="px-4 py-3 font-mono"
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-border bg-warning/[0.045] px-5 py-3 text-[10px] leading-4 text-[#e9d2a0]">
        This view exposes tradeoffs only. It does not rank structures, calculate
        probability, or identify a preferred trade.
      </footer>
    </section>
  );
}
