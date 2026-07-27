import type { TradierConfig } from "@/lib/tradier/config";

export interface TradierMarketClock {
  date: string;
  description: string;
  nextChange: string;
  nextState: string;
  state: string;
}

interface TradierClockResponse {
  clock?: {
    date?: unknown;
    description?: unknown;
    next_change?: unknown;
    next_state?: unknown;
    state?: unknown;
  };
}

interface TradierRequestOptions {
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Tradier response is missing ${field}.`);
  }
  return value;
}

/**
 * Read-only Tradier market-data adapter. This module intentionally exposes no
 * account, order, or trade endpoint.
 */
export async function getTradierMarketClock(
  config: TradierConfig,
  options: TradierRequestOptions = {},
): Promise<TradierMarketClock> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await fetchImplementation(`${config.baseUrl}/markets/clock`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.accessToken}`,
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Tradier request failed with status ${response.status}.`);
  }

  const body = (await response.json()) as TradierClockResponse;
  const clock = body.clock;
  if (!clock) {
    throw new Error("Tradier response is missing the market clock.");
  }

  return {
    date: requiredString(clock.date, "clock.date"),
    description: requiredString(clock.description, "clock.description"),
    nextChange: requiredString(clock.next_change, "clock.next_change"),
    nextState: requiredString(clock.next_state, "clock.next_state"),
    state: requiredString(clock.state, "clock.state"),
  };
}
