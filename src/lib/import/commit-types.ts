import type { Direction, ImportRowStatus } from "@/lib/import/types";

export interface ImportCommitRow {
  source_sheet_name: string;
  original_row_number: number;
  ticker_symbol: string | null;
  direction: Direction;
  raw_source_data: {
    column_a: string;
  };
  normalized_data: {
    ticker_symbol: string | null;
    normalized_input: string;
  };
  validation_status: ImportRowStatus;
  validation_errors: Array<{
    code: string;
    message: string;
  }>;
  source_observation_timestamp: string | null;
  duplicate_of_row_number: number | null;
}

export interface ImportCommitPayload {
  original_filename: string;
  file_sha256: string;
  file_size_bytes: number;
  source_type: "xlsx_column_a";
  market_data_timestamp: string | null;
  rows: ImportCommitRow[];
}

export interface ImportCounts {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}

export interface ImportSavedResult {
  ok: true;
  batchId: string;
  duplicateFile: boolean;
  processingStatus: string;
  counts: ImportCounts | null;
  message: string;
}

export interface ImportErrorResult {
  ok: false;
  error: string;
}

export type ImportApiResult = ImportSavedResult | ImportErrorResult;

export interface ImportBoundaryResult {
  ok: boolean;
  duplicate_file?: boolean;
  batch_id?: string;
  processing_status?: string;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
  duplicate_rows?: number;
  error?: string;
}
