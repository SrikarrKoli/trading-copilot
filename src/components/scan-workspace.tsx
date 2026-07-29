"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Beaker,
  BookmarkPlus,
  Clock3,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  createScannerDefinition,
  saveCurrentScan,
} from "@/app/scans/actions";
import {
  INITIAL_SCAN_ACTION_STATE,
  type CurrentScanSource,
  type SavedScanRun,
  type ScanDirection,
  type ScannerDefinition,
} from "@/lib/scan/types";

const directionMeta: Record<
  ScanDirection,
  { className: string; icon: typeof ArrowUpRight; label: string }
> = {
  bullish: {
    className: "bg-accent/10 text-accent",
    icon: ArrowUpRight,
    label: "Bullish",
  },
  bearish: {
    className: "bg-danger/10 text-danger",
    icon: ArrowDownRight,
    label: "Bearish",
  },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ActionMessage({
  message,
  status,
}: {
  message: string;
  status: "idle" | "error" | "success";
}) {
  return message ? (
    <p
      aria-live="polite"
      className={`mt-4 text-xs ${
        status === "success" ? "text-accent" : "text-danger"
      }`}
    >
      {message}
    </p>
  ) : null;
}

function CreateDefinitionForm() {
  const [state, action, pending] = useActionState(
    createScannerDefinition,
    INITIAL_SCAN_ACTION_STATE,
  );

  return (
    <form
      action={action}
      className="rounded-[24px] border border-white/[0.075] bg-card/90 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-info/[0.07] text-info">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Version a definition</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            This creates an experimental description, not executable scanner
            code or proof of validation.
          </p>
        </div>
      </div>

      <fieldset disabled={pending} className="mt-5 grid gap-4">
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Stable key
          </span>
          <input
            name="scannerKey"
            required
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="momentum-weekly-options"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 font-mono text-sm placeholder:font-sans placeholder:text-muted/60"
          />
          <span className="mt-1.5 block text-[10px] leading-4 text-muted">
            Reuse this lowercase key when the same scanner changes.
          </span>
        </label>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Display name
          </span>
          <input
            name="displayName"
            required
            maxLength={120}
            placeholder="Momentum weekly options"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Direction
            </span>
            <select
              name="direction"
              defaultValue="bullish"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Session
            </span>
            <select
              name="sessionScope"
              defaultValue="unspecified"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
            >
              <option value="unspecified">Unspecified</option>
              <option value="regular">Regular</option>
              <option value="extended">Extended</option>
              <option value="all">All sessions</option>
            </select>
          </label>
        </div>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Timeframe
          </span>
          <input
            name="timeframe"
            required
            maxLength={80}
            placeholder="Weekly / daily context"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Rule summary
          </span>
          <textarea
            name="ruleSummary"
            required
            rows={4}
            maxLength={4000}
            placeholder="Describe only the criteria you actually know. State what is still missing."
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Change note
            </span>
            <input
              name="changeNote"
              required
              maxLength={1000}
              placeholder="What changed in this version?"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium text-muted">
              Version bump
            </span>
            <select
              name="bumpKind"
              defaultValue="patch"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
            >
              <option value="patch">Patch</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-info px-4 py-3 text-sm font-semibold text-[#07111f] transition hover:-translate-y-0.5 hover:bg-[#c0cbff] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Beaker aria-hidden="true" className="size-4" />
          )}
          Save experimental version
        </button>
      </fieldset>

      <ActionMessage message={state.message} status={state.status} />
    </form>
  );
}

function SaveSnapshotForm({
  currentSources,
  definitions,
}: {
  currentSources: CurrentScanSource[];
  definitions: ScannerDefinition[];
}) {
  const [state, action, pending] = useActionState(
    saveCurrentScan,
    INITIAL_SCAN_ACTION_STATE,
  );
  const [sourceId, setSourceId] = useState(currentSources[0]?.id ?? "");
  const selectedSource = currentSources.find(({ id }) => id === sourceId);
  const compatibleDefinitions = definitions.filter(
    ({ direction }) => direction === selectedSource?.direction,
  );

  return (
    <form
      action={action}
      className="rounded-[24px] border border-white/[0.075] bg-card/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <BookmarkPlus aria-hidden="true" className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Save today&apos;s candidates</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Copies the current symbols before a future import replaces them.
          </p>
        </div>
      </div>

      <fieldset
        disabled={pending || !currentSources.length || !definitions.length}
        className="mt-5 grid gap-4"
      >
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Current import
          </span>
          <select
            name="importBatchId"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
          >
            {currentSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.direction} · {source.candidateCount} candidates ·{" "}
                {source.filename}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Compatible definition version
          </span>
          <select
            key={sourceId}
            name="scannerDefinitionId"
            defaultValue={compatibleDefinitions[0]?.id ?? ""}
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
          >
            {compatibleDefinitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.displayName} v{definition.version}
              </option>
            ))}
          </select>
          {selectedSource && !compatibleDefinitions.length ? (
            <span className="mt-1.5 block text-[10px] leading-4 text-danger">
              Create an experimental {selectedSource.direction} definition
              first.
            </span>
          ) : null}
        </label>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Snapshot name
          </span>
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Monday bullish review"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Optional notes
          </span>
          <textarea
            name="notes"
            rows={3}
            maxLength={4000}
            placeholder="Why is this snapshot worth preserving?"
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>

        <button
          type="submit"
          disabled={
            pending ||
            !currentSources.length ||
            !definitions.length ||
            !compatibleDefinitions.length
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06110d] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <BookmarkPlus aria-hidden="true" className="size-4" />
          )}
          Save immutable snapshot
        </button>
      </fieldset>

      {!currentSources.length ? (
        <p className="mt-4 text-xs leading-5 text-warning">
          Import a current bullish or bearish workbook before saving a snapshot.
        </p>
      ) : !definitions.length ? (
        <p className="mt-4 text-xs leading-5 text-warning">
          Create the matching definition version first.
        </p>
      ) : null}

      <ActionMessage message={state.message} status={state.status} />
    </form>
  );
}

function DefinitionHistory({
  definitions,
}: {
  definitions: ScannerDefinition[];
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-white/[0.075] bg-card/90">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold">Definition history</h2>
        <p className="mt-1 text-xs text-muted">
          Every rule change creates a new immutable semantic version.
        </p>
      </header>
      {definitions.length ? (
        <ol>
          {definitions.map((definition) => {
            const meta = directionMeta[definition.direction];
            const DirectionIcon = meta.icon;
            return (
              <li
                key={definition.id}
                className="interactive-row border-b border-white/[0.055] px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <DirectionIcon
                    aria-hidden="true"
                    className={`size-3.5 ${meta.className.split(" ").at(-1)}`}
                  />
                  <p className="text-sm font-semibold">
                    {definition.displayName}
                  </p>
                  <span className="rounded-full border border-white/[0.075] bg-black/15 px-2 py-0.5 font-mono text-[10px] text-muted">
                    v{definition.version}
                  </span>
                  <span className="rounded-full bg-info/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-info">
                    Experimental
                  </span>
                </div>
                <p className="mt-2 font-mono text-[10px] text-muted">
                  {definition.scannerKey} · {definition.timeframe} ·{" "}
                  {definition.sessionScope}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {definition.ruleSummary}
                </p>
                <p className="mt-2 text-[10px] leading-4 text-muted/80">
                  Change: {definition.changeNote}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="px-5 py-10 text-center">
          <Beaker aria-hidden="true" className="mx-auto size-5 text-muted" />
          <p className="mt-3 text-sm">No definition versions yet.</p>
        </div>
      )}
    </section>
  );
}

function RunCard({ run }: { run: SavedScanRun }) {
  const meta = directionMeta[run.direction];
  const DirectionIcon = meta.icon;
  const duplicates = run.results.filter(
    ({ occurrenceCount }) => occurrenceCount > 1,
  ).length;

  return (
    <article className="scroll-reveal deferred-card overflow-hidden rounded-[24px] border border-white/[0.075] bg-card/90 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <header className="border-b border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DirectionIcon
                aria-hidden="true"
                className={`size-4 ${meta.className.split(" ").at(-1)}`}
              />
              <h2 className="text-base font-semibold">{run.name}</h2>
              <span className="rounded-full border border-white/[0.075] bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-muted">
                Imported snapshot
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {run.definition.displayName} v{run.definition.version} ·{" "}
              {run.sourceFilename}
            </p>
            {run.notes ? (
              <p className="mt-3 max-w-2xl text-xs leading-5 text-muted">
                {run.notes}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="font-mono text-xl font-semibold">
              {run.results.length}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
              distinct symbols
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="size-3" />
            Saved {formatDate(run.savedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileSpreadsheet aria-hidden="true" className="size-3" />
            Batch {run.importBatchId.slice(0, 8)}
          </span>
          <span>
            Observation time:{" "}
            {run.marketDataTimestamp
              ? formatDate(run.marketDataTimestamp)
              : "not supplied"}
          </span>
          {duplicates ? <span>{duplicates} deduplicated symbols</span> : null}
        </div>
      </header>
      <ol className="flex flex-wrap gap-2 p-5">
        {run.results.map((result) => (
          <li
            key={result.symbol}
            title={`Candidate order ${result.candidateOrder}; first source row ${result.firstSourceRow}; ${result.occurrenceCount} occurrence(s)`}
            className="rounded-xl border border-white/[0.075] bg-black/15 px-3 py-2"
          >
            <span className="font-mono text-xs font-semibold">
              {result.symbol}
            </span>
            {result.occurrenceCount > 1 ? (
              <span className="ml-2 text-[9px] text-warning">
                ×{result.occurrenceCount}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </article>
  );
}

export function ScanWorkspace({
  currentSources,
  definitions,
  runs,
}: {
  currentSources: CurrentScanSource[];
  definitions: ScannerDefinition[];
  runs: SavedScanRun[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRuns = useMemo(
    () =>
      runs.filter(
        (run) =>
          !normalizedQuery ||
          run.name.toLowerCase().includes(normalizedQuery) ||
          run.definition.displayName.toLowerCase().includes(normalizedQuery) ||
          run.results.some(({ symbol }) =>
            symbol.toLowerCase().includes(normalizedQuery),
          ),
      ),
    [normalizedQuery, runs],
  );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="grid gap-5">
        <SaveSnapshotForm
          currentSources={currentSources}
          definitions={definitions}
        />
        <CreateDefinitionForm />
        <DefinitionHistory definitions={definitions} />
      </aside>

      <section aria-label="Saved scan history">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Saved scan history</h2>
            <p className="mt-1 text-xs text-muted">
              Search by snapshot, definition, or ticker.
            </p>
          </div>
          <label className="relative block sm:w-72">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
            />
            <span className="sr-only">Search saved scans</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search AAPL or snapshot name"
              className="w-full rounded-xl border border-white/[0.08] bg-card/80 py-2.5 pl-9 pr-3 text-xs placeholder:text-muted/60"
            />
          </label>
        </div>

        <div className="grid gap-4">
          {filteredRuns.length ? (
            filteredRuns.map((run) => <RunCard key={run.id} run={run} />)
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-card/45 px-5 py-16 text-center">
              <BookmarkPlus
                aria-hidden="true"
                className="mx-auto size-6 text-muted"
              />
              <h2 className="mt-4 text-sm font-semibold">
                {runs.length ? "No saved scan matches" : "No saved scans yet"}
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted">
                {runs.length
                  ? "Try a different snapshot, definition, or ticker."
                  : "Create a definition version, then preserve a current import."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
