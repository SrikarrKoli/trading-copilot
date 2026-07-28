import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { getDashboardSnapshot } from "@/lib/dashboard/data";
import type {
  CurrentScanSource,
  SavedScanResult,
  SavedScanRun,
  ScanDirection,
  ScannerDefinition,
  ScanSession,
  ScanSnapshot,
} from "@/lib/scan/types";
import { createClient } from "@/lib/supabase/server";

export interface ScannerDefinitionRow {
  change_note: string;
  created_at: string;
  direction: ScanDirection;
  display_name: string;
  id: string;
  lifecycle_status: "experimental";
  rule_summary: string;
  scanner_key: string;
  session_scope: ScanSession;
  timeframe: string;
  version_major: number;
  version_minor: number;
  version_patch: number;
}

export interface ScanRunRow {
  direction: ScanDirection;
  id: string;
  import_batch_id: string;
  market_data_timestamp: string | null;
  name: string;
  notes: string | null;
  saved_at: string;
  scanner_definition_id: string;
}

export interface ScanResultRow {
  candidate_order: number;
  first_source_row_number: number;
  scan_run_id: string;
  source_observation_timestamp: string | null;
  source_occurrence_count: number;
  source_sheet_name: string;
  ticker_symbol: string;
}

export interface ScanImportRow {
  id: string;
  market_data_timestamp: string | null;
  original_filename: string;
  uploaded_at: string;
}

function mapDefinition(row: ScannerDefinitionRow): ScannerDefinition {
  return {
    changeNote: row.change_note,
    createdAt: row.created_at,
    direction: row.direction,
    displayName: row.display_name,
    id: row.id,
    lifecycleStatus: row.lifecycle_status,
    ruleSummary: row.rule_summary,
    scannerKey: row.scanner_key,
    sessionScope: row.session_scope,
    timeframe: row.timeframe,
    version: `${row.version_major}.${row.version_minor}.${row.version_patch}`,
  };
}

export function buildSavedScanRuns(
  definitionRows: ScannerDefinitionRow[],
  runRows: ScanRunRow[],
  resultRows: ScanResultRow[],
  importRows: ScanImportRow[],
): { definitions: ScannerDefinition[]; runs: SavedScanRun[] } {
  const definitions = definitionRows.map(mapDefinition);
  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  const filenameByBatch = new Map(
    importRows.map((batch) => [batch.id, batch.original_filename]),
  );
  const resultsByRun = new Map<string, SavedScanResult[]>();

  for (const row of resultRows) {
    const results = resultsByRun.get(row.scan_run_id) ?? [];
    results.push({
      candidateOrder: row.candidate_order,
      firstSourceRow: row.first_source_row_number,
      observationTimestamp: row.source_observation_timestamp,
      occurrenceCount: row.source_occurrence_count,
      sourceSheetName: row.source_sheet_name,
      symbol: row.ticker_symbol,
    });
    resultsByRun.set(row.scan_run_id, results);
  }

  const runs = runRows.flatMap((row) => {
    const definition = definitionById.get(row.scanner_definition_id);
    if (!definition) return [];

    return [
      {
        definition,
        direction: row.direction,
        id: row.id,
        importBatchId: row.import_batch_id,
        marketDataTimestamp: row.market_data_timestamp,
        name: row.name,
        notes: row.notes,
        results: (resultsByRun.get(row.id) ?? []).sort(
          (left, right) => left.candidateOrder - right.candidateOrder,
        ),
        savedAt: row.saved_at,
        sourceFilename:
          filenameByBatch.get(row.import_batch_id) ?? "Imported workbook",
      },
    ];
  });

  return { definitions, runs };
}

async function getOwnerId(): Promise<string> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }
  return ownerId;
}

export async function getScanSnapshot(): Promise<ScanSnapshot> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const [dashboard, definitionResult, runResult] = await Promise.all([
    getDashboardSnapshot(),
    supabase
      .from("scanner_definitions")
      .select(
        "id, scanner_key, version_major, version_minor, version_patch, display_name, direction, timeframe, session_scope, lifecycle_status, rule_summary, change_note, created_at",
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("scan_runs")
      .select(
        "id, scanner_definition_id, import_batch_id, name, notes, direction, market_data_timestamp, saved_at",
      )
      .eq("owner_id", ownerId)
      .order("saved_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = definitionResult.error ?? runResult.error;
  if (firstError) {
    throw new Error(`Saved scans could not be loaded: ${firstError.message}`);
  }

  const definitionRows =
    (definitionResult.data ?? []) as ScannerDefinitionRow[];
  const runRows = (runResult.data ?? []) as ScanRunRow[];
  const runIds = runRows.map(({ id }) => id);
  const currentBatchIds = (["bullish", "bearish"] as const).flatMap(
    (direction) => dashboard.candidates[direction][0]?.importBatchId ?? [],
  );
  const batchIds = [
    ...new Set([
      ...runRows.map(({ import_batch_id }) => import_batch_id),
      ...currentBatchIds,
    ]),
  ];

  const [resultResult, importResult] = await Promise.all([
    runIds.length
      ? supabase
          .from("scan_results")
          .select(
            "scan_run_id, ticker_symbol, candidate_order, source_sheet_name, first_source_row_number, source_occurrence_count, source_observation_timestamp",
          )
          .eq("owner_id", ownerId)
          .in("scan_run_id", runIds)
          .order("candidate_order", { ascending: true })
          .limit(2000)
      : Promise.resolve({ data: [], error: null }),
    batchIds.length
      ? supabase
          .from("import_batches")
          .select(
            "id, original_filename, market_data_timestamp, uploaded_at",
          )
          .eq("owner_id", ownerId)
          .in("id", batchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const secondaryError = resultResult.error ?? importResult.error;
  if (secondaryError) {
    throw new Error(`Saved scan details could not be loaded: ${secondaryError.message}`);
  }

  const built = buildSavedScanRuns(
    definitionRows,
    runRows,
    (resultResult.data ?? []) as ScanResultRow[],
    (importResult.data ?? []) as ScanImportRow[],
  );

  const currentSources: CurrentScanSource[] = (
    ["bullish", "bearish"] as const
  ).flatMap((direction) => {
    const candidates = dashboard.candidates[direction];
    const importBatchId = candidates[0]?.importBatchId;
    if (!importBatchId) return [];
    const batch = ((importResult.data ?? []) as ScanImportRow[]).find(
      ({ id }) => id === importBatchId,
    );
    if (!batch) return [];

    return [
      {
        candidateCount: candidates.length,
        direction,
        filename: batch.original_filename,
        id: batch.id,
        marketDataTimestamp: batch.market_data_timestamp,
        uploadedAt: batch.uploaded_at,
      },
    ];
  });

  return {
    currentSources,
    definitions: built.definitions,
    runs: built.runs,
  };
}
