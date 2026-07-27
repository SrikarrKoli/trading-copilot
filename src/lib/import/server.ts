import type {
  ImportCommitPayload,
  ImportCommitRow,
} from "@/lib/import/commit-types";
import type { Direction, ImportRow } from "@/lib/import/types";
import { parseXlsxBytes } from "@/lib/import/xlsx";

function validationCode(row: ImportRow): string {
  if (row.status === "duplicate") return "duplicate_ticker_occurrence";
  if (row.message?.startsWith("Formula")) return "formula_not_allowed";
  return "invalid_ticker";
}

export async function prepareImportCommit(
  file: File,
  direction: Direction,
): Promise<ImportCommitPayload> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Choose an .xlsx workbook.");
  }

  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const preview = await parseXlsxBytes(originalBytes, file.name);

  if (preview.worksheetNames.length !== 1) {
    throw new Error(
      "This workbook has multiple worksheets. Import a workbook with one worksheet.",
    );
  }
  if (preview.rows.length === 0) {
    throw new Error("The workbook does not contain any importable source rows.");
  }

  const rows: ImportCommitRow[] = preview.rows.map((row) => {
    const tickerSymbol =
      row.status === "invalid" ? null : row.normalizedSymbol;

    return {
      source_sheet_name: preview.worksheet,
      original_row_number: row.rowNumber,
      ticker_symbol: tickerSymbol,
      direction,
      raw_source_data: { column_a: row.rawValue },
      normalized_data: {
        ticker_symbol: tickerSymbol,
        normalized_input: row.normalizedSymbol,
      },
      validation_status: row.status,
      validation_errors: row.message
        ? [{ code: validationCode(row), message: row.message }]
        : [],
      source_observation_timestamp: null,
      duplicate_of_row_number: row.duplicateOfRow ?? null,
    };
  });

  return {
    original_filename: preview.fileName,
    file_sha256: preview.sha256,
    file_size_bytes: originalBytes.byteLength,
    source_type: "xlsx_column_a",
    market_data_timestamp: null,
    rows,
  };
}
