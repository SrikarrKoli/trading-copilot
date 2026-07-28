"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FilePenLine,
  History,
  Lightbulb,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  appendManualTradeEvent,
  createManualTrade,
} from "@/app/journal/actions";
import {
  INITIAL_JOURNAL_ACTION_STATE,
  STRATEGY_OPTIONS,
  type JournalActionState,
  type JournalSourceOption,
  type JournalTrade,
  type TradeStatus,
} from "@/lib/journal/types";
import type { OptionJournalPrefill } from "@/lib/options/saved";

const STATUS_STYLES: Record<TradeStatus, string> = {
  planned: "border-[#7aa7ff]/25 bg-[#7aa7ff]/8 text-[#9bbaff]",
  open: "border-warning/25 bg-warning/8 text-warning",
  closed: "border-accent/25 bg-accent/8 text-accent",
  cancelled: "border-border bg-background text-muted",
};

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: "auto",
    style: "currency",
  }).format(value);
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function strategyLabel(value: JournalTrade["latest"]["strategyType"]): string {
  return (
    STRATEGY_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function Feedback({ state }: { state: JournalActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`mt-3 text-xs ${
        state.status === "success" ? "text-accent" : "text-danger"
      }`}
    >
      {state.message}
    </p>
  );
}

function MoneyInput({
  defaultValue,
  label,
  name,
  placeholder,
  readOnly = false,
}: {
  defaultValue?: number | null;
  label: string;
  name: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        step="0.01"
        name={name}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm read-only:cursor-not-allowed read-only:text-muted"
      />
    </label>
  );
}

function CreateTradeForm({
  initialIllustration,
  sourceOptions,
}: {
  initialIllustration: OptionJournalPrefill | null;
  sourceOptions: JournalSourceOption[];
}) {
  const [sourceId, setSourceId] = useState("");
  const [state, action, pending] = useActionState(
    createManualTrade,
    INITIAL_JOURNAL_ACTION_STATE,
  );

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-5">
      {initialIllustration ? (
        <input
          type="hidden"
          name="optionIllustrationId"
          value={initialIllustration.illustrationId}
        />
      ) : null}
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Plus aria-hidden="true" className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Create a manual trade record</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            This records your decision; it never submits or prepares an order.
          </p>
        </div>
      </div>

      <fieldset disabled={pending} className="mt-5 grid gap-4">
        {initialIllustration ? (
          <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              Strategy Lab source locked
            </p>
            <p className="mt-2 font-mono text-base font-semibold">
              {initialIllustration.symbol}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {strategyLabel(initialIllustration.strategy)} · expiry{" "}
              {initialIllustration.expiry}. Saving this plan will preserve the
              link to the exact immutable illustration.
            </p>
          </div>
        ) : (
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Start from watchlist
            </span>
            <select
              name="sourceWatchlistItemId"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              <option value="">Manual ticker</option>
              {sourceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.symbol} · {option.listName}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-[11px] leading-4 text-muted">
              A selected watchlist item overrides the manual ticker.
            </span>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Manual ticker
            </span>
            <input
              name="symbol"
              required={!sourceId}
              disabled={Boolean(sourceId)}
              readOnly={Boolean(initialIllustration)}
              defaultValue={initialIllustration?.symbol}
              maxLength={32}
              autoCapitalize="characters"
              placeholder={
                sourceId
                  ? "Using selected symbol"
                  : initialIllustration?.symbol ?? "AAPL"
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm uppercase disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Current status
            </span>
            <select
              name="status"
              defaultValue="planned"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              <option value="planned">Planned</option>
              <option value="open">Open</option>
              <option value="closed">Closed / historical</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Directional idea
            </span>
            <select
              name="direction"
              defaultValue={initialIllustration?.direction ?? "neutral"}
              disabled={Boolean(initialIllustration)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="neutral">Neutral</option>
            </select>
            {initialIllustration ? (
              <input
                type="hidden"
                name="direction"
                value={initialIllustration.direction}
              />
            ) : null}
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Strategy
            </span>
            <select
              name="strategyType"
              defaultValue={initialIllustration?.strategy ?? "long_call"}
              disabled={Boolean(initialIllustration)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              {STRATEGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {initialIllustration ? (
              <input
                type="hidden"
                name="strategyType"
                value={initialIllustration.strategy}
              />
            ) : null}
          </label>
        </div>

        {[
          {
            label: "Thesis",
            name: "thesis",
            placeholder: "What observable setup are you considering?",
          },
          {
            label: "Trade plan",
            name: "tradePlan",
            placeholder:
              "Entry conditions, invalidation, time horizon, and exit plan.",
          },
          {
            label: "Reasons I’m Wrong",
            name: "reasonsWrong",
            placeholder:
              "Contradictory evidence, missing information, invalidation conditions, and event risks.",
          },
        ].map((field) => (
          <label key={field.name}>
            <span className="mb-2 block text-xs font-medium text-muted">
              {field.label}
            </span>
            <textarea
              name={field.name}
              required
              rows={4}
              maxLength={4000}
              placeholder={field.placeholder}
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm placeholder:text-muted/60"
            />
          </label>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput
            defaultValue={initialIllustration?.intendedRisk}
            label="Intended risk"
            name="intendedRisk"
            placeholder="500.00"
            readOnly={Boolean(initialIllustration)}
          />
          <MoneyInput
            defaultValue={initialIllustration?.estimatedFees}
            label="Fees"
            name="fees"
            placeholder="0.00"
            readOnly={Boolean(initialIllustration)}
          />
          <MoneyInput
            defaultValue={initialIllustration?.entryNetValue}
            label="Entry net value"
            name="entryNetValue"
            placeholder="Debit + / credit −"
            readOnly={Boolean(initialIllustration)}
          />
          <MoneyInput
            label="Exit net value"
            name="exitNetValue"
            placeholder="Debit + / credit −"
          />
          <MoneyInput
            label="Manual realized P/L"
            name="realizedPnl"
            placeholder="Gain + / loss −"
          />
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Tags
            </span>
            <input
              name="tags"
              maxLength={800}
              placeholder="swing, earnings-risk"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            />
          </label>
        </div>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Optional creation note
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={4000}
            placeholder="Anything else that belongs with this initial snapshot?"
            className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <BookOpenText aria-hidden="true" className="size-4" />
          )}
          Create journal record
        </button>
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}

function allowedNextStatuses(status: TradeStatus): TradeStatus[] {
  if (status === "planned") return ["open", "closed", "cancelled"];
  if (status === "open") return ["closed", "cancelled"];
  return [];
}

function StatusForm({ trade }: { trade: JournalTrade }) {
  const [state, action, pending] = useActionState(
    appendManualTradeEvent,
    INITIAL_JOURNAL_ACTION_STATE,
  );
  const options = allowedNextStatuses(trade.latest.status);

  if (!options.length) {
    return (
      <p className="text-xs leading-5 text-muted">
        This record has reached a terminal status. Reflections and auditable
        plan corrections can still be added.
      </p>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="tradeId" value={trade.id} />
      <input type="hidden" name="entryType" value="status_changed" />
      <fieldset disabled={pending} className="grid gap-4">
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            New status
          </span>
          <select
            name="status"
            defaultValue={options[0]}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          >
            {options.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput
            defaultValue={trade.latest.entryNetValue}
            label="Entry net value"
            name="entryNetValue"
          />
          <MoneyInput
            defaultValue={trade.latest.exitNetValue}
            label="Exit net value"
            name="exitNetValue"
          />
          <MoneyInput
            defaultValue={trade.latest.fees}
            label="Fees"
            name="fees"
          />
          <MoneyInput
            defaultValue={trade.latest.realizedPnl}
            label="Manual realized P/L"
            name="realizedPnl"
          />
        </div>
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Status note
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={4000}
            placeholder="What changed?"
            className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-warning/30 px-4 py-3 text-sm font-medium text-warning transition hover:bg-warning/10 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ArrowRight aria-hidden="true" className="size-4" />
          )}
          Record status change
        </button>
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}

function PlanRevisionForm({ trade }: { trade: JournalTrade }) {
  const [state, action, pending] = useActionState(
    appendManualTradeEvent,
    INITIAL_JOURNAL_ACTION_STATE,
  );
  return (
    <form action={action}>
      <input type="hidden" name="tradeId" value={trade.id} />
      <input type="hidden" name="entryType" value="plan_revised" />
      <input type="hidden" name="status" value={trade.latest.status} />
      <fieldset disabled={pending} className="grid gap-4">
        {[
          ["Thesis", "thesis", trade.latest.thesis],
          ["Trade plan", "tradePlan", trade.latest.tradePlan],
          ["Reasons I’m Wrong", "reasonsWrong", trade.latest.reasonsWrong],
        ].map(([label, name, value]) => (
          <label key={name}>
            <span className="mb-2 block text-xs font-medium text-muted">
              {label}
            </span>
            <textarea
              name={name}
              required
              rows={3}
              maxLength={4000}
              defaultValue={value}
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            />
          </label>
        ))}
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Revision note
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={4000}
            placeholder="Why did the plan change?"
            className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#7aa7ff]/30 px-4 py-3 text-sm font-medium text-[#9bbaff] transition hover:bg-[#7aa7ff]/10 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <FilePenLine aria-hidden="true" className="size-4" />
          )}
          Append plan revision
        </button>
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}

function ReflectionForm({ trade }: { trade: JournalTrade }) {
  const [state, action, pending] = useActionState(
    appendManualTradeEvent,
    INITIAL_JOURNAL_ACTION_STATE,
  );
  return (
    <form action={action}>
      <input type="hidden" name="tradeId" value={trade.id} />
      <input type="hidden" name="entryType" value="reflection" />
      <input type="hidden" name="status" value={trade.latest.status} />
      <fieldset disabled={pending} className="grid gap-4">
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Reflection
          </span>
          <textarea
            name="note"
            required
            rows={3}
            maxLength={4000}
            placeholder="What did you observe about the decision or execution?"
            className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Mistakes
            </span>
            <textarea
              name="mistakes"
              rows={3}
              maxLength={4000}
              placeholder="What should not be repeated?"
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Lessons
            </span>
            <textarea
              name="lessons"
              rows={3}
              maxLength={4000}
              placeholder="What should inform the next decision?"
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            />
          </label>
        </div>
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">Tags</span>
          <input
            name="tags"
            maxLength={800}
            defaultValue={trade.latest.tags.join(", ")}
            placeholder="patient-entry, event-risk"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-3 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Lightbulb aria-hidden="true" className="size-4" />
          )}
          Append reflection
        </button>
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}

function TradeCard({ trade }: { trade: JournalTrade }) {
  const latest = trade.latest;
  const pnlPositive = (latest.realizedPnl ?? 0) >= 0;

  return (
    <article
      id={`trade-${trade.id}`}
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-mono text-lg font-semibold tracking-wide">
              {trade.symbol}
            </h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${STATUS_STYLES[latest.status]}`}
            >
              {latest.status}
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted">
              {latest.direction}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {strategyLabel(latest.strategyType)} · created{" "}
            {formatTimestamp(trade.createdAt)}
          </p>
          {trade.sourceOptionIllustrationId ? (
            <Link
              href="/strategy-lab"
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent transition hover:text-accent-strong"
            >
              Linked Strategy Lab snapshot
              <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          ) : null}
        </div>
        <div className="text-left sm:text-right">
          <p
            className={`font-mono text-lg font-semibold ${
              latest.realizedPnl === null
                ? "text-muted"
                : pnlPositive
                  ? "text-accent"
                  : "text-danger"
            }`}
          >
            {formatMoney(latest.realizedPnl)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted">
            Manual realized P/L
          </p>
        </div>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-3">
        {[
          ["Thesis", latest.thesis],
          ["Trade plan", latest.tradePlan],
          ["Reasons I’m Wrong", latest.reasonsWrong],
        ].map(([label, value]) => (
          <section key={label}>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {label}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground/90">
              {value}
            </p>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-2 border-y border-border sm:grid-cols-5">
        {[
          ["Intended risk", formatMoney(latest.intendedRisk)],
          ["Entry net", formatMoney(latest.entryNetValue)],
          ["Exit net", formatMoney(latest.exitNetValue)],
          ["Fees", formatMoney(latest.fees)],
          ["Snapshots", String(trade.entryCount)],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-border px-4 py-3 last:border-r-0">
            <p className="font-mono text-sm">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      {latest.note || latest.mistakes || latest.lessons ? (
        <div className="grid gap-4 border-b border-border bg-background/35 p-5 sm:grid-cols-3">
          {[
            ["Latest note", latest.note],
            ["Mistakes", latest.mistakes],
            ["Lessons", latest.lessons],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {label}
              </p>
              <p className="mt-2 text-xs leading-5 text-foreground/90">
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {latest.tags.length ? (
        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
          {latest.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <details className="group p-5">
          <summary className="cursor-pointer list-none text-xs font-medium text-warning">
            Update status
          </summary>
          <div className="mt-5">
            <StatusForm trade={trade} />
          </div>
        </details>
        <details className="group p-5">
          <summary className="cursor-pointer list-none text-xs font-medium text-[#9bbaff]">
            Revise plan
          </summary>
          <div className="mt-5">
            <PlanRevisionForm trade={trade} />
          </div>
        </details>
        <details className="group p-5">
          <summary className="cursor-pointer list-none text-xs font-medium text-accent">
            Add reflection
          </summary>
          <div className="mt-5">
            <ReflectionForm trade={trade} />
          </div>
        </details>
      </div>

      <details className="border-t border-border p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted">
          <History aria-hidden="true" className="size-3.5" />
          View immutable audit trail ({trade.history.length})
        </summary>
        <ol className="mt-4 grid gap-2">
          {trade.history.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-3 sm:flex-row sm:items-center"
            >
              <span className="text-xs capitalize">
                {entry.entryType.replaceAll("_", " ")}
              </span>
              <span className="text-[11px] text-muted sm:ml-auto">
                {entry.status} · {formatTimestamp(entry.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

export function JournalWorkspace({
  initialIllustration,
  sourceOptions,
  trades,
}: {
  initialIllustration: OptionJournalPrefill | null;
  sourceOptions: JournalSourceOption[];
  trades: JournalTrade[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TradeStatus | "all">("all");

  const filteredTrades = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    return trades.filter(
      (trade) =>
        (!normalized || trade.symbol.includes(normalized)) &&
        (status === "all" || trade.latest.status === status),
    );
  }, [query, status, trades]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="xl:sticky xl:top-6">
        <CreateTradeForm
          initialIllustration={initialIllustration}
          sourceOptions={sourceOptions}
        />
      </div>
      <div>
        <section
          aria-label="Journal filters"
          className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[minmax(220px,1fr)_180px]"
        >
          <label className="relative">
            <span className="sr-only">Search ticker</span>
            <Search
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search journal ticker"
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3.5 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TradeStatus | "all")
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="planned">Planned</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </section>

        {filteredTrades.length ? (
          <section aria-label="Trade journal records" className="grid gap-4">
            {filteredTrades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-16 text-center">
            {trades.length ? (
              <AlertTriangle
                aria-hidden="true"
                className="mx-auto size-6 text-muted"
              />
            ) : (
              <BookOpenText
                aria-hidden="true"
                className="mx-auto size-6 text-muted"
              />
            )}
            <h2 className="mt-4 text-sm font-semibold">
              {trades.length ? "No matching records" : "No journal records yet"}
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              {trades.length
                ? "Adjust the ticker or status filter."
                : "Create the first record manually or link it to a watchlist symbol."}
            </p>
          </section>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: CheckCircle2,
              text: "Every correction appends a snapshot.",
            },
            {
              icon: CircleDollarSign,
              text: "P/L is manually entered, never inferred.",
            },
            {
              icon: Clock3,
              text: "Broker synchronization remains pending.",
            },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-[11px] leading-4 text-muted"
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
