import { getDemoDashboardSnapshot, isDemoDatasetActive } from "@/lib/demo/dataset";
import { summarizeReviews, type DashboardReviewRow } from "@/lib/dashboard/summary";
import { createClient } from "@/lib/supabase/server";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";

export type DashboardDirection = "bullish" | "bearish";

export interface DashboardCandidate {
  direction: DashboardDirection;
  importBatchId: string;
  sourceRow: number;
  symbol: string;
  validationStatus: "valid" | "duplicate";
}

export interface DashboardImport {
  completedAt: string | null;
  direction: DashboardDirection;
  duplicateRows: number;
  filename: string;
  id: string;
  invalidRows: number;
  marketDataTimestamp: string | null;
  status: string;
  totalRows: number;
  uploadedAt: string;
  validRows: number;
}

export interface DashboardSnapshot {
  candidates: Record<DashboardDirection, DashboardCandidate[]>;
  imports: DashboardImport[];
  reviewCounts: ReturnType<typeof summarizeReviews>;
  activeWatchlistCount: number;
  watchlistItemCount: number;
  journalTradeCount: number;
}

interface StockRow {
  import_batch_id: string;
  original_row_number: number;
  ticker_symbol: string | null;
  validation_status: "valid" | "invalid" | "duplicate";
}

interface ImportRow {
  completed_at: string | null;
  direction: DashboardDirection;
  duplicate_rows: number;
  file_sha256: string;
  id: string;
  invalid_rows: number;
  market_data_timestamp: string | null;
  original_filename: string;
  processing_status: string;
  total_rows: number;
  uploaded_at: string;
  valid_rows: number;
}

export function buildCandidates(
  direction: DashboardDirection,
  rows: StockRow[],
): DashboardCandidate[] {
  const seen = new Set<string>();

  return rows.flatMap((row) => {
    if (
      !row.ticker_symbol ||
      row.validation_status === "invalid" ||
      seen.has(row.ticker_symbol)
    ) {
      return [];
    }

    seen.add(row.ticker_symbol);
    return [
      {
        direction,
        importBatchId: row.import_batch_id,
        sourceRow: row.original_row_number,
        symbol: row.ticker_symbol,
        validationStatus: row.validation_status,
      },
    ];
  });
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (await isDemoDatasetActive()) return getDemoDashboardSnapshot();
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }

  const supabase = await createClient();

  const [importsResult, bullishResult, bearishResult] = await Promise.all([
    supabase
      .from("import_batches")
      .select(
        "id, direction, original_filename, file_sha256, processing_status, total_rows, valid_rows, invalid_rows, duplicate_rows, market_data_timestamp, uploaded_at, completed_at",
      )
      .eq("owner_id", ownerId)
      .order("uploaded_at", { ascending: false })
      .limit(10),
    supabase
      .from("bullish_stocks")
      .select(
        "import_batch_id, original_row_number, ticker_symbol, validation_status",
      )
      .eq("owner_id", ownerId)
      .order("original_row_number", { ascending: true }),
    supabase
      .from("bearish_stocks")
      .select(
        "import_batch_id, original_row_number, ticker_symbol, validation_status",
      )
      .eq("owner_id", ownerId)
      .order("original_row_number", { ascending: true }),
  ]);

  const firstError =
    importsResult.error ?? bullishResult.error ?? bearishResult.error;
  if (firstError) {
    throw new Error(`Dashboard data could not be loaded: ${firstError.message}`);
  }

  const importRows = (importsResult.data ?? []) as ImportRow[];
  const bullishRows = (bullishResult.data ?? []) as StockRow[];
  const bearishRows = (bearishResult.data ?? []) as StockRow[];

  const candidates = {
    bullish: buildCandidates("bullish", bullishRows),
    bearish: buildCandidates("bearish", bearishRows),
  };
  const allCandidates = [...candidates.bullish, ...candidates.bearish];
  const batchIds = [...new Set(allCandidates.map((candidate) => candidate.importBatchId))];
  const [listsResult, itemsResult, tradesResult] = await Promise.all([
    supabase.from("watchlists").select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId).is("archived_at", null),
    supabase.from("watchlist_items").select("id, watchlists!inner(id)", { count: "exact", head: true })
      .eq("owner_id", ownerId).is("archived_at", null).is("watchlists.archived_at", null),
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
  ]);
  const summaryError = listsResult.error ?? itemsResult.error ?? tradesResult.error;
  if (summaryError) throw new Error(`Dashboard summary could not be loaded: ${summaryError.message}`);

  // Page through append-only history so older current candidates are not silently omitted.
  const reviews: DashboardReviewRow[] = [];
  if (batchIds.length) {
    for (let offset = 0; ; offset += 1000) {
      const result = await supabase.from("review_actions")
        .select("id, import_batch_id, direction, ticker_symbol, action, created_at")
        .eq("owner_id", ownerId).in("import_batch_id", batchIds)
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + 999);
      if (result.error) throw new Error(`Review summary could not be loaded: ${result.error.message}`);
      const page = (result.data ?? []) as DashboardReviewRow[];
      reviews.push(...page);
      if (page.length < 1000) break;
    }
  }

  return {
    candidates,
    reviewCounts: summarizeReviews(allCandidates, reviews),
    activeWatchlistCount: listsResult.count ?? 0,
    watchlistItemCount: itemsResult.count ?? 0,
    journalTradeCount: tradesResult.count ?? 0,
    imports: importRows.map((row) => ({
      completedAt: row.completed_at,
      direction: row.direction,
      duplicateRows: row.duplicate_rows,
      filename: row.original_filename,
      id: row.id,
      invalidRows: row.invalid_rows,
      marketDataTimestamp: row.market_data_timestamp,
      status: row.processing_status,
      totalRows: row.total_rows,
      uploadedAt: row.uploaded_at,
      validRows: row.valid_rows,
    })),
  };
}
