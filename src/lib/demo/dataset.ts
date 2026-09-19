import { headers } from "next/headers";
import { hostnameFromHost, isAuthBypassEnabled, isTempAuthUnlockEnabled } from "@/lib/auth/config";
import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import type { DashboardSnapshot, DashboardCandidate } from "@/lib/dashboard/data";
import type { ReviewQueueSnapshot, ReviewAction } from "@/lib/review/types";
import type { SavedEvidenceAssessment } from "@/lib/evidence/data";
import type { WatchlistSnapshot } from "@/lib/watchlist/types";
import type { JournalSnapshot, JournalEntrySnapshot } from "@/lib/journal/types";
import type { ScanSnapshot } from "@/lib/scan/types";
import type { StrategyLabSource, StrategyLabSourceRequest } from "@/lib/options/source-types";
import { calculateSetupAlignment, type ManualEvidenceInput, SETUP_ALIGNMENT_VERSION } from "@/lib/evidence/score";

export const DEMO_READ_ONLY_MESSAGE = "Demo dataset is read-only under TEMP_AUTH_UNLOCK or local auth bypass. Sign in as owner to persist.";
export async function isDemoDatasetActive(): Promise<boolean> {
  const bypass = isTempAuthUnlockEnabled() || (process.env.LOCAL_AUTH_BYPASS === "true" &&
    isAuthBypassEnabled(hostnameFromHost((await headers()).get("host"))));
  return Boolean(bypass && !(await getPermanentOwnerClaims()));
}
const id = (n: number) => `de000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const observed = "2026-07-24T20:00:00.000Z";
const saved = "2026-07-25T14:30:00.000Z";
const candidates: DashboardCandidate[] = [
  ...["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "AVGO", "COST", "JPM", "LLY"].map((symbol, i) => ({ symbol, direction: "bullish" as const, importBatchId: id(1), sourceRow: i + 4, validationStatus: "valid" as const })),
  ...["TSLA", "INTC", "BA", "NKE", "PYPL", "DIS", "F", "UPS"].map((symbol, i) => ({ symbol, direction: "bearish" as const, importBatchId: id(2), sourceRow: i + 4, validationStatus: "valid" as const })),
];
const actions: (ReviewAction | null)[] = ["watchlisted", "saved", null, "deferred", "watchlisted", null, "dismissed", null, "saved", null, "watchlisted", "deferred", "dismissed", null, "saved", null, null, null];
// Complete synthetic inputs, scored by the same rules as owner assessments.
// These are illustrative observations, never historical market-price claims.
export function getDemoEvidenceInputs(): ManualEvidenceInput[] {
  return [0, 1, 3, 4, 6, 10, 11, 12].map((index, i) => {
    const c = candidates[index];
    const passes = [9, 8, 6, 8, 4, 7, 5, 4][i];
    const bullish = c.direction === "bullish";
    return { symbol: c.symbol, direction: c.direction, price: 100, marketCapBillions: 50,
      ema20: bullish ? 98 : 102, ema50: bullish ? 95 : 105,
      macdSignal: passes >= 5 ? c.direction : "neutral", rsi: passes >= 6 ? (bullish ? 60 : 40) : 50,
      atrPercent: passes >= 7 ? 2 : 1, adx: passes >= 8 ? 30 : 20,
      averageVolumeMillions: passes >= 9 ? 5 : 2, rangeReference20Day: bullish ? 110 : 90,
      observationTime: observed, sourceLabel: "Synthetic demo · historical manual research example" };
  });
}
const assessments: SavedEvidenceAssessment[] = getDemoEvidenceInputs().map((input, i) => ({
  ...candidates.find(c => c.symbol === input.symbol)!, id: id(100 + i), observationSource: input.sourceLabel!,
  observationTimestamp: observed, savedAt: saved, score: calculateSetupAlignment(input).score!, scoreVersion: SETUP_ALIGNMENT_VERSION,
}));
export function getDemoEvidenceAssessments(source = candidates): SavedEvidenceAssessment[] {
  return structuredClone(assessments.filter(a => source.some(c => c.importBatchId === a.importBatchId && c.direction === a.direction && c.symbol === a.symbol)));
}
export function getDemoReviewQueueSnapshot(): ReviewQueueSnapshot {
  return structuredClone({ candidates: candidates.map((c, i) => ({ ...c,
    latestEvidence: assessments.find(a => a.symbol === c.symbol) ?? null,
    latestAction: actions[i] ? { action: actions[i]!, id: id(200 + i), createdAt: saved, reasonCode: "needs_research" as const, note: "Demo research decision. Recheck observations before considering a manual plan." } : null,
  })), counts: { all: 18, bullish: 10, bearish: 8 } });
}
export function getDemoWatchlistSnapshot(): WatchlistSnapshot {
  const lists = ["Quality growth · monitor", "Downside · event review"].map((name, i) => ({
    id: id(300 + i), name, createdAt: saved, direction: i === 0 ? "bullish" as const : "bearish" as const,
    notes: "Demo research only. Historical observations; no live quotes.",
    items: (i === 0 ? [0, 4] : [10]).map(index => ({
      id: id(400 + index), symbol: candidates[index].symbol, addedAt: saved, sourceCount: 1,
      thesis: "Reassess trend, liquidity, and event risk before drafting a trade plan.",
      latestSource: { addedAt: saved, direction: candidates[index].direction, importBatchId: candidates[index].importBatchId },
    })),
  }));
  return structuredClone({ lists, itemCount: 3, sourceCount: 3 });
}
export function getDemoJournalSnapshot(): JournalSnapshot {
  const trades = [0, 4, 10].map((index, i) => {
    const latest: JournalEntrySnapshot = { id: id(600 + i), createdAt: saved, direction: candidates[index].direction,
      entryNetValue: null, exitNetValue: null, fees: null, intendedRisk: 250, realizedPnl: null,
      entryType: "plan_created", status: "planned", strategyType: i === 2 ? "bear_put_debit_spread" : "bull_call_debit_spread",
      lessons: null, mistakes: null, note: "Synthetic manual plan; no execution or market quote.",
      reasonsWrong: "Trend reversal or an earnings gap could invalidate the thesis.", tags: ["demo", "manual-plan"],
      thesis: "Research a defined-risk spread after confirming trend and event calendar.",
      tradePlan: "Verify fresh observations and option liquidity. Choose strikes manually; maximum intended risk $250. No order submitted.",
    };
    return { id: id(500 + i), symbol: candidates[index].symbol, createdAt: saved, entryCount: 1, latest, history: [latest], sourceOptionIllustrationId: null, sourceWatchlistItemId: id(400 + index) };
  });
  return structuredClone({ trades, counts: { all: 3, planned: 3, open: 0, closed: 0, cancelled: 0 }, realizedPnl: 0 });
}
export function getDemoDashboardSnapshot(): DashboardSnapshot {
  const reviewCounts = { unreviewed: 0, saved: 0, dismissed: 0, deferred: 0, watchlisted: 0 };
  actions.forEach(action => reviewCounts[action ?? "unreviewed"]++);
  return structuredClone({ candidates: { bullish: candidates.filter(c => c.direction === "bullish"), bearish: candidates.filter(c => c.direction === "bearish") },
    reviewCounts, activeWatchlistCount: 2, watchlistItemCount: 3, journalTradeCount: 3,
    imports: (["bullish", "bearish"] as const).map((direction, i) => ({ id: id(i + 1), direction,
      filename: `thinkorswim_${direction}_2026-07-24.xlsx`, completedAt: saved, uploadedAt: saved,
      marketDataTimestamp: i === 0 ? observed : null, status: "completed", totalRows: i === 0 ? 10 : 8,
      validRows: i === 0 ? 10 : 8, invalidRows: 0, duplicateRows: 0 })),
  });
}
export function getDemoScanSnapshot(): ScanSnapshot {
  const definition = { id: id(700), displayName: "Trend alignment research", scannerKey: "demo-trend", direction: "bullish" as const,
    version: "1.0.0", lifecycleStatus: "experimental" as const, createdAt: saved, changeNote: "Synthetic demo definition",
    ruleSummary: "Manual trend, volume, and momentum screening; validate all evidence independently.", sessionScope: "regular" as const, timeframe: "Daily" };
  const imports = getDemoDashboardSnapshot().imports;
  return { definitions: [definition], currentSources: imports.map(b => ({ id: b.id, direction: b.direction, filename: b.filename,
    marketDataTimestamp: b.marketDataTimestamp, uploadedAt: b.uploadedAt, candidateCount: b.validRows })),
    runs: [{ id: id(701), definition, direction: "bullish", importBatchId: id(1), marketDataTimestamp: observed,
      name: "July 24 · demo import snapshot", notes: "Historical synthetic research sample", savedAt: saved, sourceFilename: imports[0].filename,
      results: candidates.filter(c => c.direction === "bullish").map((c, i) => ({ symbol: c.symbol, candidateOrder: i + 1,
        firstSourceRow: c.sourceRow, observationTimestamp: observed, occurrenceCount: 1, sourceSheetName: "Scan results" })) }],
  };
}
export function getDemoStrategySource(request: StrategyLabSourceRequest): StrategyLabSource | null {
  const item = request.kind === "watchlist" ? getDemoWatchlistSnapshot().lists.flatMap(l => l.items).find(i => i.id === request.watchlistItemId) : null;
  const candidate = candidates.find(c => request.kind === "review" ? c.symbol === request.symbol && c.direction === request.direction && c.importBatchId === request.importBatchId : c.symbol === item?.symbol);
  if (!candidate) return null;
  const evidence = assessments.find(a => a.symbol === candidate.symbol);
  return { ...candidate, kind: request.kind, request, label: "Demo dataset · historical research", evidenceAssessmentId: evidence?.id ?? null,
    evidenceScore: evidence?.score ?? null, watchlistItemId: item?.id ?? null };
}
