export const SCAN_DIRECTIONS = ["bullish", "bearish"] as const;
export type ScanDirection = (typeof SCAN_DIRECTIONS)[number];

export const SCAN_SESSIONS = [
  "regular",
  "extended",
  "all",
  "unspecified",
] as const;
export type ScanSession = (typeof SCAN_SESSIONS)[number];

export const VERSION_BUMPS = ["patch", "minor", "major"] as const;
export type VersionBump = (typeof VERSION_BUMPS)[number];

export interface ScannerDefinition {
  changeNote: string;
  createdAt: string;
  direction: ScanDirection;
  displayName: string;
  id: string;
  lifecycleStatus: "experimental";
  ruleSummary: string;
  scannerKey: string;
  sessionScope: ScanSession;
  timeframe: string;
  version: string;
}

export interface CurrentScanSource {
  candidateCount: number;
  direction: ScanDirection;
  filename: string;
  id: string;
  marketDataTimestamp: string | null;
  uploadedAt: string;
}

export interface SavedScanResult {
  candidateOrder: number;
  firstSourceRow: number;
  observationTimestamp: string | null;
  occurrenceCount: number;
  sourceSheetName: string;
  symbol: string;
}

export interface SavedScanRun {
  definition: ScannerDefinition;
  direction: ScanDirection;
  id: string;
  importBatchId: string;
  marketDataTimestamp: string | null;
  name: string;
  notes: string | null;
  results: SavedScanResult[];
  savedAt: string;
  sourceFilename: string;
}

export interface ScanSnapshot {
  currentSources: CurrentScanSource[];
  definitions: ScannerDefinition[];
  runs: SavedScanRun[];
}

export interface ScanActionState {
  message: string;
  status: "idle" | "error" | "success";
}

export const INITIAL_SCAN_ACTION_STATE: ScanActionState = {
  message: "",
  status: "idle",
};
