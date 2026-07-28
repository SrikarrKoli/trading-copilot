import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import type {
  JournalEntrySnapshot,
  JournalEntryType,
  JournalSnapshot,
  JournalSourceOption,
  JournalTrade,
  StrategyType,
  TradeDirection,
  TradeStatus,
} from "@/lib/journal/types";
import { createClient } from "@/lib/supabase/server";

export interface TradeRow {
  created_at: string;
  id: string;
  source_watchlist_item_id: string | null;
  ticker_symbol: string;
}

export interface JournalEntryRow {
  created_at: string;
  direction: TradeDirection;
  entry_net_value: number | string | null;
  entry_type: JournalEntryType;
  exit_net_value: number | string | null;
  fees: number | string | null;
  id: string;
  intended_risk: number | string | null;
  lessons: string | null;
  mistakes: string | null;
  note: string | null;
  realized_pnl: number | string | null;
  reasons_wrong: string;
  strategy_type: StrategyType;
  tags: string[];
  thesis: string;
  trade_id: string;
  trade_plan: string;
  trade_status: TradeStatus;
}

export interface TradeOptionSourceRow {
  option_illustration_id: string;
  trade_id: string;
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapEntry(row: JournalEntryRow): JournalEntrySnapshot {
  return {
    createdAt: row.created_at,
    direction: row.direction,
    entryNetValue: toNumber(row.entry_net_value),
    entryType: row.entry_type,
    exitNetValue: toNumber(row.exit_net_value),
    fees: toNumber(row.fees),
    id: row.id,
    intendedRisk: toNumber(row.intended_risk),
    lessons: row.lessons,
    mistakes: row.mistakes,
    note: row.note,
    realizedPnl: toNumber(row.realized_pnl),
    reasonsWrong: row.reasons_wrong,
    status: row.trade_status,
    strategyType: row.strategy_type,
    tags: row.tags,
    thesis: row.thesis,
    tradePlan: row.trade_plan,
  };
}

export function buildJournalSnapshot(
  tradeRows: TradeRow[],
  entryRows: JournalEntryRow[],
  optionSourceRows: TradeOptionSourceRow[] = [],
): JournalSnapshot {
  const entriesByTrade = new Map<string, JournalEntryRow[]>();
  for (const entry of entryRows) {
    const entries = entriesByTrade.get(entry.trade_id) ?? [];
    entries.push(entry);
    entriesByTrade.set(entry.trade_id, entries);
  }

  const trades: JournalTrade[] = [];
  const optionSources = new Map(
    optionSourceRows.map((source) => [
      source.trade_id,
      source.option_illustration_id,
    ]),
  );
  for (const trade of tradeRows) {
    const entries = entriesByTrade.get(trade.id) ?? [];
    const latest = entries[0];
    if (!latest) continue;

    trades.push({
      createdAt: trade.created_at,
      entryCount: entries.length,
      history: entries.map(mapEntry),
      id: trade.id,
      latest: mapEntry(latest),
      sourceOptionIllustrationId: optionSources.get(trade.id) ?? null,
      sourceWatchlistItemId: trade.source_watchlist_item_id,
      symbol: trade.ticker_symbol,
    });
  }

  const counts: JournalSnapshot["counts"] = {
    all: trades.length,
    cancelled: 0,
    closed: 0,
    open: 0,
    planned: 0,
  };
  let realizedPnl = 0;

  for (const trade of trades) {
    counts[trade.latest.status] += 1;
    if (
      trade.latest.status === "closed" &&
      trade.latest.realizedPnl !== null
    ) {
      realizedPnl += trade.latest.realizedPnl;
    }
  }

  return { counts, realizedPnl, trades };
}

async function getOwnerId(): Promise<string> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }

  return ownerId;
}

export async function getJournalSnapshot(): Promise<JournalSnapshot> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const { data: tradeData, error: tradeError } = await supabase
    .from("trades")
    .select("id, ticker_symbol, source_watchlist_item_id, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (tradeError) {
    throw new Error(`Trades could not be loaded: ${tradeError.message}`);
  }

  const tradeRows = (tradeData ?? []) as TradeRow[];
  if (!tradeRows.length) {
    return {
      counts: { all: 0, cancelled: 0, closed: 0, open: 0, planned: 0 },
      realizedPnl: 0,
      trades: [],
    };
  }

  const tradeIds = tradeRows.map(({ id }) => id);
  const [entriesResult, optionSourcesResult] = await Promise.all([
    supabase
      .from("journal_entries")
      .select(
        "id, trade_id, entry_type, trade_status, direction, strategy_type, thesis, trade_plan, reasons_wrong, intended_risk, entry_net_value, exit_net_value, fees, realized_pnl, note, mistakes, lessons, tags, created_at",
      )
      .eq("owner_id", ownerId)
      .in("trade_id", tradeIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("trade_option_illustration_sources")
      .select("trade_id, option_illustration_id")
      .eq("owner_id", ownerId)
      .in("trade_id", tradeIds),
  ]);

  if (entriesResult.error) {
    throw new Error(
      `Journal entries could not be loaded: ${entriesResult.error.message}`,
    );
  }
  if (optionSourcesResult.error) {
    throw new Error(
      `Strategy sources could not be loaded: ${optionSourcesResult.error.message}`,
    );
  }

  return buildJournalSnapshot(
    tradeRows,
    (entriesResult.data ?? []) as JournalEntryRow[],
    (optionSourcesResult.data ?? []) as TradeOptionSourceRow[],
  );
}

export async function getJournalSourceOptions(): Promise<
  JournalSourceOption[]
> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const { data: listData, error: listError } = await supabase
    .from("watchlists")
    .select("id, name")
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (listError) {
    throw new Error(`Watchlist sources could not be loaded: ${listError.message}`);
  }

  const lists = (listData ?? []) as { id: string; name: string }[];
  if (!lists.length) return [];

  const { data: itemData, error: itemError } = await supabase
    .from("watchlist_items")
    .select("id, watchlist_id, ticker_symbol")
    .eq("owner_id", ownerId)
    .in(
      "watchlist_id",
      lists.map(({ id }) => id),
    )
    .is("archived_at", null)
    .order("added_at", { ascending: false });

  if (itemError) {
    throw new Error(`Watchlist sources could not be loaded: ${itemError.message}`);
  }

  const names = new Map(lists.map(({ id, name }) => [id, name]));
  return (
    (itemData ?? []) as {
      id: string;
      ticker_symbol: string;
      watchlist_id: string;
    }[]
  ).map((item) => ({
    id: item.id,
    listName: names.get(item.watchlist_id) ?? "Watchlist",
    symbol: item.ticker_symbol,
  }));
}
