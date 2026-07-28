export type StrategySourceDirection = "bullish" | "bearish";

export type StrategyLabSourceRequest =
  | {
      kind: "watchlist";
      watchlistItemId: string;
    }
  | {
      direction: StrategySourceDirection;
      importBatchId: string;
      kind: "review";
      symbol: string;
    };

export interface StrategyLabSource {
  direction: StrategySourceDirection;
  evidenceAssessmentId: string | null;
  evidenceScore: number | null;
  importBatchId: string;
  kind: StrategyLabSourceRequest["kind"];
  label: string;
  request: StrategyLabSourceRequest;
  sourceRow: number;
  symbol: string;
  watchlistItemId: string | null;
}

export interface SavedOptionSource {
  direction: StrategySourceDirection;
  evidenceAssessmentId: string | null;
  evidenceScore: number | null;
  importBatchId: string;
  kind: StrategyLabSourceRequest["kind"];
  sourceRow: number;
  watchlistItemId: string | null;
}
