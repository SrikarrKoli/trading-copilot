"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleHelp,
  Gauge,
  LoaderCircle,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";

import { saveManualEvidenceAssessment } from "@/app/evidence/actions";
import type { DashboardCandidate } from "@/lib/dashboard/data";
import type { SavedEvidenceAssessment } from "@/lib/evidence/data";
import {
  calculateSetupAlignment,
  EvidenceInputError,
  SETUP_ALIGNMENT_VERSION,
  type EvidenceComponentResult,
  type MacdSignal,
  type ManualEvidenceInput,
  type SetupAlignmentResult,
} from "@/lib/evidence/score";

interface FormState {
  adx: string;
  atrPercent: string;
  averageVolumeMillions: string;
  ema20: string;
  ema50: string;
  macdSignal: MacdSignal | "";
  marketCapBillions: string;
  observationTime: string;
  price: string;
  rangeReference20Day: string;
  rsi: string;
  sourceLabel: string;
}

const initialFormState: FormState = {
  adx: "",
  atrPercent: "",
  averageVolumeMillions: "",
  ema20: "",
  ema50: "",
  macdSignal: "",
  marketCapBillions: "",
  observationTime: "",
  price: "",
  rangeReference20Day: "",
  rsi: "",
  sourceLabel: "",
};

const statusMeta = {
  fail: {
    className: "border-danger/20 bg-danger/8 text-danger",
    icon: X,
    label: "Failed",
  },
  missing: {
    className: "border-warning/20 bg-warning/8 text-warning",
    icon: CircleHelp,
    label: "Missing",
  },
  pass: {
    className: "border-accent/20 bg-accent/8 text-accent",
    icon: Check,
    label: "Passed",
  },
} as const;

function candidateKey(candidate: DashboardCandidate): string {
  return `${candidate.direction}:${candidate.importBatchId}:${candidate.symbol}`;
}

function savedAssessmentKey(assessment: SavedEvidenceAssessment): string {
  return `${assessment.importBatchId}:${assessment.direction}:${assessment.symbol}`;
}

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not supplied";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function NumberInput({
  hint,
  label,
  name,
  onChange,
  placeholder,
  state,
  step = "0.01",
}: {
  hint: string;
  label: string;
  name: keyof FormState;
  onChange: (name: keyof FormState, value: string) => void;
  placeholder: string;
  state: FormState;
  step?: string;
}) {
  return (
    <label>
      <span className="mb-2 flex items-center justify-between gap-3 text-xs font-medium">
        <span>{label}</span>
        <span className="text-[9px] font-normal text-muted">{hint}</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        step={step}
        value={state[name]}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm placeholder:text-muted/55"
      />
    </label>
  );
}

function ComponentRow({
  component,
}: {
  component: EvidenceComponentResult;
}) {
  const meta = statusMeta[component.status];
  const StatusIcon = meta.icon;

  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="font-medium">{component.label}</div>
        <div className="mt-1 text-[10px] text-muted">{component.rule}</div>
      </td>
      <td className="px-4 py-3.5 font-mono text-xs">{component.observed}</td>
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${meta.className}`}
        >
          <StatusIcon aria-hidden="true" className="size-3" />
          {meta.label}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold">
        {component.earnedPoints}/{component.availablePoints}
      </td>
    </tr>
  );
}

function ScoreResult({
  canSave,
  input,
  onSave,
  result,
  saved,
  saveMessage,
  saveStatus,
  saving,
}: {
  canSave: boolean;
  input: ManualEvidenceInput;
  onSave: () => void;
  result: SetupAlignmentResult;
  saved: boolean;
  saveMessage: string;
  saveStatus: "idle" | "error" | "success";
  saving: boolean;
}) {
  const passed = result.components.filter(
    ({ status }) => status === "pass",
  ).length;
  const failed = result.components.filter(
    ({ status }) => status === "fail",
  );
  const missing = result.components.filter(
    ({ status }) => status === "missing",
  );
  const bullish = input.direction === "bullish";
  const DirectionIcon = bullish ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DirectionIcon
                aria-hidden="true"
                className={`size-4 ${bullish ? "text-accent" : "text-danger"}`}
              />
              <h2 className="text-sm font-semibold">
                {input.symbol} manual setup assessment
              </h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {input.direction} · observed {formatTimestamp(input.observationTime)}
              {" · source "}
              {input.sourceLabel || "not supplied"}
              {" · "}
              {result.version}
            </p>
          </div>
          <button
            type="button"
            disabled={!canSave || saved || saving}
            onClick={onSave}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#9bbaff]/25 bg-[#9bbaff]/8 px-3 py-2 text-xs font-medium text-[#b7ccff] transition hover:bg-[#9bbaff]/12 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
            )}
            {saved
              ? "Snapshot saved"
              : saving
                ? "Saving snapshot…"
                : !result.complete
                  ? "Complete evidence to save"
                  : !canSave
                    ? "Add source and time to save"
                    : "Save assessment"}
          </button>
        </header>

        {saveMessage ? (
          <p
            aria-live="polite"
            className={`border-b border-border px-5 py-3 text-xs ${
              saveStatus === "success" ? "text-accent" : "text-danger"
            }`}
          >
            {saveMessage}
          </p>
        ) : null}

        <div className="grid gap-px bg-border sm:grid-cols-4">
          {[
            ["Setup alignment", result.score === null ? "—" : `${result.score}/100`],
            ["Evidence complete", `${result.completeness.toFixed(0)}%`],
            ["Rules passed", `${passed}/10`],
            ["Earned so far", `${result.earnedPoints}/100`],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-5 py-4">
              <p className="font-mono text-xl font-semibold">{value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-border bg-background/45 text-[10px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Component and rule</th>
                <th className="px-4 py-3 font-medium">Observed</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-5 py-3 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.components.map((component) => (
                <ComponentRow key={component.id} component={component} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-warning/20 bg-warning/[0.045] p-5">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle aria-hidden="true" className="size-4" />
          <h2 className="text-sm font-semibold">Reasons I&apos;m wrong</h2>
        </div>
        {failed.length || missing.length ? (
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#e9d2a0]">
            {failed.map((item) => (
              <li key={item.id}>
                • Failed: {item.label} — {item.observed}; required {item.rule}.
              </li>
            ))}
            {missing.map((item) => (
              <li key={item.id}>
                • Missing: {item.label}; the score remains unpublished.
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[#e9d2a0]">
            No configured rule failed, but this is still rule alignment—not
            evidence that the trade will work. Event risk, option liquidity,
            valuation, and historical outcome evidence are not included.
          </p>
        )}
      </section>
    </div>
  );
}

function ComparisonBoard({
  items,
}: {
  items: SavedEvidenceAssessment[];
}) {
  const sortedItems = items.toSorted(
    (left, right) =>
      right.score - left.score ||
      left.symbol.localeCompare(right.symbol),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="border-b border-border p-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 aria-hidden="true" className="size-4 text-[#9bbaff]" />
            <h2 className="text-sm font-semibold">
              Saved current assessments
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
            The latest saved snapshot for each current candidate, sorted by
            rule alignment and then symbol. Older snapshots remain in the
            evidence ledger for traceability.
          </p>
        </div>
      </header>

      {items.length ? (
        <figure className="p-5">
          <ol className="grid gap-4">
            {sortedItems.map((item, index) => {
              const score = item.score;
              const bullish = item.direction === "bullish";
              return (
                <li key={item.id} className="grid gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-mono text-[10px] text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {item.symbol}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] capitalize ${
                        bullish
                          ? "bg-accent/8 text-accent"
                          : "bg-danger/8 text-danger"
                      }`}
                    >
                      {item.direction}
                    </span>
                    <span className="ml-auto font-mono text-xs font-semibold">
                      {score}/100
                    </span>
                  </div>
                  <div className="ml-8 h-2 overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className={`h-full rounded-full ${
                        bullish ? "bg-accent" : "bg-danger"
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="ml-8 text-[10px] leading-4 text-muted">
                    Observed {formatTimestamp(item.observationTimestamp)} ·{" "}
                    {item.observationSource}
                  </p>
                </li>
              );
            })}
          </ol>
          <figcaption className="mt-5 border-t border-border pt-4 text-[10px] leading-4 text-muted">
            Bars encode only Setup Alignment {SETUP_ALIGNMENT_VERSION}. They do
            not encode calibrated confidence, historical win rate, position
            size, or investment suitability.
          </figcaption>
        </figure>
      ) : (
        <div className="px-6 py-12 text-center">
          <Gauge aria-hidden="true" className="mx-auto size-6 text-muted" />
          <h3 className="mt-4 text-sm font-semibold">No completed assessments</h3>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted">
            Calculate a candidate with all ten evidence components, then save
            the snapshot. Saved assessments remain available after reload.
          </p>
        </div>
      )}
    </section>
  );
}

export function EvidenceWorkspace({
  candidates,
  initialAssessments,
}: {
  candidates: DashboardCandidate[];
  initialAssessments: SavedEvidenceAssessment[];
}) {
  const [state, setState] = useState(initialFormState);
  const [selectedKey, setSelectedKey] = useState(
    candidates[0] ? candidateKey(candidates[0]) : "",
  );
  const [calculatedInput, setCalculatedInput] =
    useState<ManualEvidenceInput | null>(null);
  const [calculatedImportBatchId, setCalculatedImportBatchId] = useState<
    string | null
  >(null);
  const [result, setResult] = useState<SetupAlignmentResult | null>(null);
  const [error, setError] = useState("");
  const [savedAssessments, setSavedAssessments] =
    useState(initialAssessments);
  const [savedResult, setSavedResult] =
    useState<SetupAlignmentResult | null>(null);
  const [saveState, setSaveState] = useState<{
    message: string;
    status: "idle" | "error" | "success";
  }>({ message: "", status: "idle" });
  const [saving, startSaving] = useTransition();
  const selectedCandidate =
    candidates.find((candidate) => candidateKey(candidate) === selectedKey) ??
    null;
  const canSave = Boolean(
    calculatedInput?.observationTime &&
      calculatedInput.sourceLabel &&
      calculatedImportBatchId &&
      result?.complete,
  );
  const saved = result !== null && savedResult === result;

  const onChange = (name: keyof FormState, value: string) => {
    setState((current) => ({ ...current, [name]: value }));
  };

  const resetObservations = () => {
    setState(initialFormState);
    setCalculatedInput(null);
    setCalculatedImportBatchId(null);
    setResult(null);
    setSavedResult(null);
    setSaveState({ message: "", status: "idle" });
    setError("");
  };

  const calculate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCandidate) {
      setError("Import a current candidate before calculating setup alignment.");
      return;
    }

    try {
      const input: ManualEvidenceInput = {
        adx: optionalNumber(state.adx),
        atrPercent: optionalNumber(state.atrPercent),
        averageVolumeMillions: optionalNumber(state.averageVolumeMillions),
        direction: selectedCandidate.direction,
        ema20: optionalNumber(state.ema20),
        ema50: optionalNumber(state.ema50),
        macdSignal: state.macdSignal || null,
        marketCapBillions: optionalNumber(state.marketCapBillions),
        observationTime: state.observationTime
          ? new Date(state.observationTime).toISOString()
          : null,
        price: optionalNumber(state.price),
        rangeReference20Day: optionalNumber(state.rangeReference20Day),
        rsi: optionalNumber(state.rsi),
        sourceLabel: state.sourceLabel.trim() || null,
        symbol: selectedCandidate.symbol,
      };
      const nextResult = calculateSetupAlignment(input);
      setCalculatedInput(input);
      setCalculatedImportBatchId(selectedCandidate.importBatchId);
      setResult(nextResult);
      setSavedResult(null);
      setSaveState({ message: "", status: "idle" });
      setError("");
    } catch (caught) {
      setCalculatedInput(null);
      setCalculatedImportBatchId(null);
      setResult(null);
      setSavedResult(null);
      setSaveState({ message: "", status: "idle" });
      setError(
        caught instanceof EvidenceInputError
          ? caught.message
          : "The setup alignment could not be calculated.",
      );
    }
  };

  const selectCandidate = (value: string) => {
    setSelectedKey(value);
    resetObservations();
  };

  const saveAssessment = () => {
    if (
      !calculatedInput ||
      !calculatedImportBatchId ||
      !result ||
      !canSave
    ) {
      return;
    }

    const inputToSave = calculatedInput;
    const resultToSave = result;
    const importBatchId = calculatedImportBatchId;
    startSaving(async () => {
      const response = await saveManualEvidenceAssessment({
        ...inputToSave,
        importBatchId,
      });
      setSaveState({
        message: response.message,
        status: response.status,
      });

      if (response.status === "success" && response.assessment) {
        const assessment = response.assessment;
        const key = savedAssessmentKey(assessment);
        setSavedAssessments((current) => [
          assessment,
          ...current.filter((item) => savedAssessmentKey(item) !== key),
        ]);
        setSavedResult(resultToSave);
      }
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <form
          onSubmit={calculate}
          className="rounded-2xl border border-border bg-card p-5 xl:sticky xl:top-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Manual market evidence</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Enter observations from one consistent timestamp and source.
              </p>
            </div>
            <button
              type="button"
              aria-label="Reset evidence fields"
              onClick={resetObservations}
              className="rounded-lg border border-border p-2 text-muted transition hover:text-foreground"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-xs font-medium">
                Current candidate
              </span>
              <select
                disabled={!candidates.length}
                onChange={(event) => selectCandidate(event.target.value)}
                value={selectedKey}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
              >
                {candidates.map((candidate) => (
                  <option
                    key={candidateKey(candidate)}
                    value={candidateKey(candidate)}
                  >
                    {candidate.symbol} · {candidate.direction}
                  </option>
                ))}
              </select>
            </label>

            {selectedCandidate ? (
              <div
                className={`rounded-xl border px-4 py-3 text-xs ${
                  selectedCandidate.direction === "bullish"
                    ? "border-accent/20 bg-accent/[0.045] text-accent"
                    : "border-danger/20 bg-danger/[0.045] text-danger"
                }`}
              >
                {selectedCandidate.symbol} is a current{" "}
                {selectedCandidate.direction} imported candidate. Inclusion is
                not itself a score.
              </div>
            ) : (
              <div className="rounded-xl border border-warning/20 bg-warning/[0.045] px-4 py-3 text-xs leading-5 text-[#e9d2a0]">
                No current candidates are available. Import today&apos;s
                Thinkorswim workbook first.
              </div>
            )}

            <label>
              <span className="mb-2 block text-xs font-medium">
                Observation time
              </span>
              <input
                type="datetime-local"
                name="observationTime"
                onChange={(event) =>
                  onChange("observationTime", event.target.value)
                }
                value={state.observationTime}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium">
                Observation source
              </span>
              <input
                name="sourceLabel"
                maxLength={120}
                onChange={(event) =>
                  onChange("sourceLabel", event.target.value)
                }
                placeholder="Thinkorswim daily chart"
                value={state.sourceLabel}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm placeholder:text-muted/55"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <NumberInput
                hint="must exceed $20"
                label="Current price"
                name="price"
                onChange={onChange}
                placeholder="100.00"
                state={state}
              />
              <NumberInput
                hint="billions; must exceed 5"
                label="Market capitalization"
                name="marketCapBillions"
                onChange={onChange}
                placeholder="120"
                state={state}
              />
            </div>

            <fieldset className="rounded-xl border border-border p-4">
              <legend className="px-2 text-xs font-semibold">Trend</legend>
              <div className="grid gap-4">
                <NumberInput
                  hint="directional price test"
                  label="20 EMA"
                  name="ema20"
                  onChange={onChange}
                  placeholder="98.00"
                  state={state}
                />
                <NumberInput
                  hint="directional price test"
                  label="50 EMA"
                  name="ema50"
                  onChange={onChange}
                  placeholder="94.00"
                  state={state}
                />
                <label>
                  <span className="mb-2 flex items-center justify-between gap-3 text-xs font-medium">
                    <span>MACD state</span>
                    <span className="text-[9px] font-normal text-muted">
                      must match direction
                    </span>
                  </span>
                  <select
                    name="macdSignal"
                    onChange={(event) =>
                      onChange("macdSignal", event.target.value)
                    }
                    value={state.macdSignal}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
                  >
                    <option value="">Not supplied</option>
                    <option value="bullish">Bullish</option>
                    <option value="bearish">Bearish</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-border p-4">
              <legend className="px-2 text-xs font-semibold">
                Strength and activity
              </legend>
              <div className="grid gap-4">
                <NumberInput
                  hint={
                    selectedCandidate?.direction === "bearish"
                      ? "30 through 45"
                      : "55 through 70"
                  }
                  label="RSI"
                  name="rsi"
                  onChange={onChange}
                  placeholder="62"
                  state={state}
                />
                <NumberInput
                  hint="must exceed 1.5%"
                  label="ATR as % of price"
                  name="atrPercent"
                  onChange={onChange}
                  placeholder="2.10"
                  state={state}
                />
                <NumberInput
                  hint="must exceed 25"
                  label="ADX"
                  name="adx"
                  onChange={onChange}
                  placeholder="31"
                  state={state}
                />
                <NumberInput
                  hint="millions; must exceed 3"
                  label="Average volume"
                  name="averageVolumeMillions"
                  onChange={onChange}
                  placeholder="8.20"
                  state={state}
                />
                <NumberInput
                  hint="price must be within 2%"
                  label={`20-day ${
                    selectedCandidate?.direction === "bearish" ? "low" : "high"
                  }`}
                  name="rangeReference20Day"
                  onChange={onChange}
                  placeholder={
                    selectedCandidate?.direction === "bearish"
                      ? "99.00"
                      : "101.00"
                  }
                  state={state}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={!selectedCandidate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Gauge aria-hidden="true" className="size-4" />
              Calculate setup alignment
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

        {result && calculatedInput ? (
          <ScoreResult
            canSave={canSave}
            input={calculatedInput}
            onSave={saveAssessment}
            result={result}
            saved={saved}
            saveMessage={saveState.message}
            saveStatus={saveState.status}
            saving={saving}
          />
        ) : (
          <section className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <Gauge aria-hidden="true" className="mx-auto size-7 text-muted" />
            <h2 className="mt-4 text-base font-semibold">
              No setup alignment calculated
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted">
              Select a current candidate and enter whatever market observations
              you have. Missing evidence remains visible and prevents the score
              from being saved.
            </p>
          </section>
        )}
      </div>

      <ComparisonBoard items={savedAssessments} />
    </div>
  );
}
