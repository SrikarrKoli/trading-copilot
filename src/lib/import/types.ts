export type Direction = "bullish" | "bearish";

export type ImportRowStatus = "valid" | "duplicate" | "invalid";

export interface ImportRow {
  rowNumber: number;
  rawValue: string;
  normalizedSymbol: string;
  status: ImportRowStatus;
  duplicateOfRow?: number;
  message?: string;
}

export interface ImportIssue {
  severity: "warning" | "error";
  message: string;
  rowNumber?: number;
}

export interface WorkbookPreview {
  fileName: string;
  fileSize: number;
  sha256: string;
  worksheet: string;
  worksheetNames: string[];
  layout: "thinkorswim_watchlist" | "generic_header" | "headerless";
  headerRow: number | null;
  dataStartRow: number;
  sourceRowCount: number;
  blankCount: number;
  candidateCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ImportRow[];
  issues: ImportIssue[];
}
