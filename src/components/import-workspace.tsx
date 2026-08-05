"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type DragEvent, useState } from "react";

import { ControlButton } from "@/components/ui/button";
import type { ImportApiResult } from "@/lib/import/commit-types";
import type { Direction, WorkbookPreview } from "@/lib/import/types";
import { parseWorkbookFile } from "@/lib/import/xlsx";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function layoutLabel(layout: WorkbookPreview["layout"]): string {
  if (layout === "thinkorswim_watchlist") return "Thinkorswim";
  if (layout === "generic_header") return "Generic header";
  return "Headerless";
}

export function ImportWorkspace() {
  const [direction, setDirection] = useState<Direction>("bullish");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [savedResult, setSavedResult] = useState<ImportApiResult | null>(null);

  async function inspectFile(file: File) {
    setIsParsing(true);
    setError(null);
    setSavedResult(null);
    setSelectedFile(null);
    try {
      const parsed = await parseWorkbookFile(file);
      setPreview(parsed);
      setSelectedFile(file);
    } catch (caughtError) {
      setPreview(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The workbook could not be inspected.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  async function approveImport() {
    if (!selectedFile || !preview) return;

    setIsCommitting(true);
    setError(null);
    setSavedResult(null);

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("direction", direction);

    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ImportApiResult;

      if (!response.ok || !result.ok) {
        setError(result.ok ? "The import could not be saved." : result.error);
        return;
      }

      setSavedResult(result);
    } catch {
      setError("The import could not be saved. No success was recorded.");
    } finally {
      setIsCommitting(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void inspectFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void inspectFile(file);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.76fr)_minmax(620px,1.24fr)]">
        <section
          aria-labelledby="upload-heading"
          className="rounded-[24px] border border-white/[0.075] bg-card/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.15)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Step 01
              </p>
              <h2 id="upload-heading" className="mt-1.5 text-lg font-semibold">
                Select source
              </h2>
            </div>
            <ShieldCheck aria-hidden="true" className="size-5 text-accent" />
          </div>

          <fieldset className="mt-7">
            <legend className="mb-2.5 text-xs font-medium text-muted">
              Declared direction
            </legend>
            <div className="grid grid-cols-2 rounded-xl border border-white/[0.075] bg-black/20 p-1">
              {(["bullish", "bearish"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={direction === value}
                  onClick={() => {
                    setDirection(value);
                    setSavedResult(null);
                  }}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium capitalize transition ${
                    direction === value
                      ? value === "bullish"
                        ? "bg-positive text-[#06110d]"
                        : "bg-[#e77c7c] text-[#180707]"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs leading-5 text-muted">
              Direction is user-declared. The filename is never treated as
              proof.
            </p>
          </fieldset>

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-7 rounded-[20px] border border-dashed p-7 text-center transition ${
              isDragging
                ? "border-accent bg-accent/[0.055]"
                : "border-white/[0.12] bg-black/15 hover:border-white/20"
            }`}
          >
            <div className="mx-auto grid size-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
              {isParsing ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-5 animate-spin text-accent"
                />
              ) : (
                <Upload aria-hidden="true" className="size-5 text-accent" />
              )}
            </div>
            <p className="mt-4 text-sm font-medium">
              {isParsing ? "Inspecting workbook…" : "Drop a scanner workbook"}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              `.xlsx` only · 10 MB maximum · column A only
            </p>
            <label
              htmlFor="workbook-file"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
            >
              <FileSpreadsheet aria-hidden="true" className="size-4" />
              Choose workbook
            </label>
            <input
              id="workbook-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isParsing}
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-4 flex gap-3 rounded-xl border border-danger/25 bg-danger/8 p-3.5"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-danger"
              />
              <p className="text-xs leading-5 text-[#ffc2c2]">{error}</p>
            </div>
          ) : null}

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-medium text-foreground">
              Supported canonical layout
            </p>
            <div className="mt-3 grid grid-cols-[52px_1fr] gap-y-2 text-xs">
              <span className="font-mono text-muted">A1</span>
              <span>Watchlist Scanner</span>
              <span className="font-mono text-muted">A2</span>
              <span>Results</span>
              <span className="font-mono text-muted">A3</span>
              <span>Symbol</span>
              <span className="font-mono text-accent">A4+</span>
              <span className="text-accent">Stock identifiers</span>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="preview-heading"
          className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.075] bg-card/90 shadow-[0_24px_70px_rgba(0,0,0,0.15)]"
        >
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Step 02
              </p>
              <h2 id="preview-heading" className="mt-1.5 text-lg font-semibold">
                Review parsed rows
              </h2>
            </div>
            {preview ? (
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted">
                  {preview.worksheet}
                </span>
                <button
                  type="button"
                  aria-label="Choose another worksheet"
                  disabled={preview.worksheetNames.length === 1}
                  className="grid size-8 place-items-center rounded-md border border-border text-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronDown aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {preview ? (
            <>
              <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
                <div className="border-b border-r border-border p-4 lg:border-b-0 sm:p-5">
                  <p className="text-xs text-muted">Candidates</p>
                  <p className="mt-2 font-mono text-2xl font-medium text-accent">
                    {preview.candidateCount}
                  </p>
                </div>
                <div className="border-b border-border p-4 lg:border-b-0 lg:border-r sm:p-5">
                  <p className="text-xs text-muted">Duplicates</p>
                  <p className="mt-2 font-mono text-2xl font-medium">
                    {preview.duplicateCount}
                  </p>
                </div>
                <div className="border-r border-border p-4 sm:p-5">
                  <p className="text-xs text-muted">Invalid</p>
                  <p
                    className={`mt-2 font-mono text-2xl font-medium ${
                      preview.invalidCount ? "text-danger" : ""
                    }`}
                  >
                    {preview.invalidCount}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted">Detected schema</p>
                  <p className="mt-2 truncate text-sm font-medium">
                    {layoutLabel(preview.layout)}
                  </p>
                </div>
              </div>

              <div className="border-b border-border px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10">
                      <FileSpreadsheet
                        aria-hidden="true"
                        className="size-4 text-accent"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {preview.fileName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatFileSize(preview.fileSize)} · rows begin at A
                        {preview.dataStartRow}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted">
                    SHA {preview.sha256.slice(0, 12)}
                  </span>
                </div>
              </div>

              {preview.issues.length ? (
                <div className="border-b border-warning/20 bg-warning/[0.055] px-5 py-3.5 sm:px-6">
                  <div className="flex gap-2.5">
                    <Info
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-warning"
                    />
                    <p className="text-xs leading-5 text-[#e9d2a0]">
                      {preview.issues[0].message}
                      {preview.issues.length > 1
                        ? ` +${preview.issues.length - 1} more issue${
                            preview.issues.length === 2 ? "" : "s"
                          }`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="max-h-[430px] overflow-auto">
                <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0e1312] text-[10px] uppercase tracking-[0.11em] text-muted">
                    <tr>
                      <th className="border-b border-border px-5 py-3 font-medium sm:px-6">
                        Row
                      </th>
                      <th className="border-b border-border px-4 py-3 font-medium">
                        Raw value
                      </th>
                      <th className="border-b border-border px-4 py-3 font-medium">
                        Normalized
                      </th>
                      <th className="border-b border-border px-4 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className="interactive-row border-b border-white/[0.055] last:border-0"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-muted sm:px-6">
                          A{row.rowNumber}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs">
                          {row.rawValue}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-medium">
                          {row.normalizedSymbol}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${
                              row.status === "valid"
                                ? "bg-accent/10 text-accent"
                                : row.status === "duplicate"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-danger/10 text-danger"
                            }`}
                          >
                            {row.status === "valid" ? (
                              <Check aria-hidden="true" className="size-3" />
                            ) : (
                              <AlertCircle
                                aria-hidden="true"
                                className="size-3"
                              />
                            )}
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  {savedResult?.ok ? (
                    <>
                      <p className="text-xs font-medium text-accent">
                        {savedResult.message}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-muted">
                        Batch {savedResult.batchId}
                      </p>
                      {savedResult.counts ? (
                        <p className="mt-1 text-[11px] text-muted">
                          {savedResult.counts.totalRows} total ·{" "}
                          {savedResult.counts.validRows} valid ·{" "}
                          {savedResult.counts.invalidRows} invalid ·{" "}
                          {savedResult.counts.duplicateRows} duplicate
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium">
                        Preview only — approval is required
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        The server revalidates the original workbook before
                        saving.
                      </p>
                    </>
                  )}
                </div>
                <ControlButton
                  onClick={() => void approveImport()}
                  disabled={!selectedFile || isCommitting}
                  tone="primary"
                  className="gap-2 text-sm"
                >
                  {isCommitting ? (
                    <>
                      Saving
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    </>
                  ) : (
                    "Approve import"
                  )}
                </ControlButton>
              </div>
            </>
          ) : (
            <div className="grid min-h-[640px] place-items-center p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                  <RefreshCw aria-hidden="true" className="size-5 text-muted" />
                </div>
                <h3 className="mt-5 text-base font-semibold">
                  Preview waits for a workbook
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Upload the bullish or bearish export. The importer will keep
                  source row numbers, normalize identifiers, and call out every
                  issue before anything is committed.
                </p>
                <div className="mt-6 flex items-center justify-center gap-5 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Check aria-hidden="true" className="size-3 text-accent" />
                    No formulas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check aria-hidden="true" className="size-3 text-accent" />
                    No external links
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
    </div>
  );
}
