import type { StrategyLabSourceRequest } from "@/lib/options/source-types";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/;

export function parseStrategyLabSourceRequest(
  value: unknown,
): StrategyLabSourceRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    candidate.kind === "watchlist" &&
    typeof candidate.watchlistItemId === "string" &&
    UUID_PATTERN.test(candidate.watchlistItemId)
  ) {
    return {
      kind: "watchlist",
      watchlistItemId: candidate.watchlistItemId,
    };
  }

  if (
    candidate.kind === "review" &&
    typeof candidate.importBatchId === "string" &&
    UUID_PATTERN.test(candidate.importBatchId) &&
    (candidate.direction === "bullish" ||
      candidate.direction === "bearish") &&
    typeof candidate.symbol === "string"
  ) {
    const symbol = candidate.symbol.trim().toUpperCase();
    if (!TICKER_PATTERN.test(symbol)) return null;
    return {
      direction: candidate.direction,
      importBatchId: candidate.importBatchId,
      kind: "review",
      symbol,
    };
  }

  return null;
}

export function strategySourceRequestFromSearchParams(params: {
  direction?: string | string[];
  importBatch?: string | string[];
  symbol?: string | string[];
  watchlistItem?: string | string[];
}): StrategyLabSourceRequest | null {
  if (
    typeof params.watchlistItem === "string" &&
    UUID_PATTERN.test(params.watchlistItem)
  ) {
    return {
      kind: "watchlist",
      watchlistItemId: params.watchlistItem,
    };
  }

  return parseStrategyLabSourceRequest({
    direction: params.direction,
    importBatchId: params.importBatch,
    kind: "review",
    symbol: params.symbol,
  });
}

export function strategyLabSourceHref(
  request: StrategyLabSourceRequest,
): string {
  const params = new URLSearchParams();
  if (request.kind === "watchlist") {
    params.set("watchlistItem", request.watchlistItemId);
  } else {
    params.set("importBatch", request.importBatchId);
    params.set("direction", request.direction);
    params.set("symbol", request.symbol);
  }
  return `/strategy-lab?${params.toString()}`;
}
