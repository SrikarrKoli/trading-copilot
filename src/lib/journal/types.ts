export const TRADE_STATUSES = [
  "planned",
  "open",
  "closed",
  "cancelled",
] as const;

export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const TRADE_DIRECTIONS = ["bullish", "bearish", "neutral"] as const;

export type TradeDirection = (typeof TRADE_DIRECTIONS)[number];

export const STRATEGY_OPTIONS = [
  { value: "long_call", label: "Long call" },
  { value: "long_put", label: "Long put" },
  { value: "bull_call_debit_spread", label: "Bull call debit spread" },
  { value: "bear_put_debit_spread", label: "Bear put debit spread" },
  { value: "bull_put_credit_spread", label: "Bull put credit spread" },
  { value: "bear_call_credit_spread", label: "Bear call credit spread" },
  { value: "iron_condor", label: "Iron condor" },
  { value: "calendar_spread", label: "Calendar spread" },
  { value: "stock", label: "Stock" },
  { value: "other", label: "Other" },
] as const;

export type StrategyType = (typeof STRATEGY_OPTIONS)[number]["value"];

export const JOURNAL_ENTRY_TYPES = [
  "plan_created",
  "plan_revised",
  "status_changed",
  "reflection",
] as const;

export type JournalEntryType = (typeof JOURNAL_ENTRY_TYPES)[number];

export interface JournalEntrySnapshot {
  createdAt: string;
  direction: TradeDirection;
  entryNetValue: number | null;
  entryType: JournalEntryType;
  exitNetValue: number | null;
  fees: number | null;
  id: string;
  intendedRisk: number | null;
  lessons: string | null;
  mistakes: string | null;
  note: string | null;
  realizedPnl: number | null;
  reasonsWrong: string;
  status: TradeStatus;
  strategyType: StrategyType;
  tags: string[];
  thesis: string;
  tradePlan: string;
}

export interface JournalTrade {
  createdAt: string;
  entryCount: number;
  history: JournalEntrySnapshot[];
  id: string;
  latest: JournalEntrySnapshot;
  sourceWatchlistItemId: string | null;
  symbol: string;
}

export interface JournalSnapshot {
  counts: Record<TradeStatus | "all", number>;
  realizedPnl: number;
  trades: JournalTrade[];
}

export interface JournalSourceOption {
  id: string;
  listName: string;
  symbol: string;
}

export interface JournalActionState {
  message: string;
  status: "idle" | "error" | "success";
}

export const INITIAL_JOURNAL_ACTION_STATE: JournalActionState = {
  message: "",
  status: "idle",
};
