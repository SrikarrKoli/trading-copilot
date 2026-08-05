import { createClient } from "@/lib/supabase/server";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { getChicagoTradingDate } from "@/lib/market-date";

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
  trading_date: string;
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
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }

  const supabase = await createClient();
  const tradingDate = getChicagoTradingDate();

  const importsResult = await supabase
    .from("import_batches")
    .select(
      "id, direction, original_filename, file_sha256, processing_status, total_rows, valid_rows, invalid_rows, duplicate_rows, market_data_timestamp, trading_date, uploaded_at, completed_at",
    )
    .eq("owner_id", ownerId)
    .eq("trading_date", tradingDate)
    .order("uploaded_at", { ascending: false })
    .limit(10);

  if (importsResult.error) {
    throw new Error(
      `Dashboard data could not be loaded: ${importsResult.error.message}`,
    );
  }

  const importRows = (importsResult.data ?? []) as ImportRow[];
  const activeBatchIds = importRows
    .filter(({ processing_status }) => processing_status === "completed")
    .map(({ id }) => id);
  const emptyStockResult = Promise.resolve({ data: [], error: null });
  const [bullishResult, bearishResult] = activeBatchIds.length
    ? await Promise.all([
        supabase
          .from("bullish_stocks")
          .select(
            "import_batch_id, original_row_number, ticker_symbol, validation_status",
          )
          .eq("owner_id", ownerId)
          .in("import_batch_id", activeBatchIds)
          .order("original_row_number", { ascending: true }),
        supabase
          .from("bearish_stocks")
          .select(
            "import_batch_id, original_row_number, ticker_symbol, validation_status",
          )
          .eq("owner_id", ownerId)
          .in("import_batch_id", activeBatchIds)
          .order("original_row_number", { ascending: true }),
      ])
    : await Promise.all([emptyStockResult, emptyStockResult]);

  const firstError = bullishResult.error ?? bearishResult.error;
  if (firstError) {
    throw new Error(`Dashboard data could not be loaded: ${firstError.message}`);
  }

  const bullishRows = (bullishResult.data ?? []) as StockRow[];
  const bearishRows = (bearishResult.data ?? []) as StockRow[];

  return {
    candidates: {
      bullish: buildCandidates("bullish", bullishRows),
      bearish: buildCandidates("bearish", bearishRows),
    },
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
