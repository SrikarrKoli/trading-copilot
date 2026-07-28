export const WATCHLIST_DIRECTIONS = [
  "bullish",
  "bearish",
  "research",
] as const;

export type WatchlistDirection = (typeof WATCHLIST_DIRECTIONS)[number];

export interface WatchlistOption {
  direction: WatchlistDirection;
  id: string;
  name: string;
}

export interface WatchlistItemSource {
  addedAt: string;
  direction: "bullish" | "bearish";
  importBatchId: string;
}

export interface WatchlistItem {
  addedAt: string;
  id: string;
  latestSource: WatchlistItemSource | null;
  sourceCount: number;
  symbol: string;
  thesis: string | null;
}

export interface Watchlist {
  createdAt: string;
  direction: WatchlistDirection;
  id: string;
  items: WatchlistItem[];
  name: string;
  notes: string | null;
}

export interface WatchlistSnapshot {
  itemCount: number;
  lists: Watchlist[];
  sourceCount: number;
}

export interface WatchlistActionState {
  message: string;
  status: "idle" | "error" | "success";
}

export const INITIAL_WATCHLIST_ACTION_STATE: WatchlistActionState = {
  message: "",
  status: "idle",
};
