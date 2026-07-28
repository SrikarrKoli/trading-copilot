import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { createClient } from "@/lib/supabase/server";
import type {
  Watchlist,
  WatchlistDirection,
  WatchlistItemSource,
  WatchlistOption,
  WatchlistSnapshot,
} from "@/lib/watchlist/types";

export interface WatchlistRow {
  created_at: string;
  direction: WatchlistDirection;
  id: string;
  name: string;
  notes: string | null;
}

export interface WatchlistItemRow {
  added_at: string;
  id: string;
  thesis: string | null;
  ticker_symbol: string;
  watchlist_id: string;
}

export interface WatchlistSourceRow {
  added_at: string;
  direction: "bullish" | "bearish";
  import_batch_id: string;
  watchlist_item_id: string;
}

async function getOwnerId(): Promise<string> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }

  return ownerId;
}

export async function getWatchlistOptions(): Promise<WatchlistOption[]> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .select("id, name, direction")
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Watchlists could not be loaded: ${error.message}`);
  }

  return (data ?? []) as WatchlistOption[];
}

export function buildWatchlistSnapshot(
  listRows: WatchlistRow[],
  itemRows: WatchlistItemRow[],
  sourceRows: WatchlistSourceRow[],
): WatchlistSnapshot {
  const sourcesByItem = new Map<string, WatchlistItemSource[]>();
  for (const source of sourceRows) {
    const entries = sourcesByItem.get(source.watchlist_item_id) ?? [];
    entries.push({
      addedAt: source.added_at,
      direction: source.direction,
      importBatchId: source.import_batch_id,
    });
    sourcesByItem.set(source.watchlist_item_id, entries);
  }

  const itemsByList = new Map<string, Watchlist["items"]>();
  for (const item of itemRows) {
    const sources = sourcesByItem.get(item.id) ?? [];
    const entries = itemsByList.get(item.watchlist_id) ?? [];
    entries.push({
      addedAt: item.added_at,
      id: item.id,
      latestSource: sources[0] ?? null,
      sourceCount: sources.length,
      symbol: item.ticker_symbol,
      thesis: item.thesis,
    });
    itemsByList.set(item.watchlist_id, entries);
  }

  return {
    itemCount: itemRows.length,
    lists: listRows.map((list) => ({
      createdAt: list.created_at,
      direction: list.direction,
      id: list.id,
      items: itemsByList.get(list.id) ?? [],
      name: list.name,
      notes: list.notes,
    })),
    sourceCount: sourceRows.length,
  };
}

export async function getWatchlistSnapshot(): Promise<WatchlistSnapshot> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const { data: listData, error: listError } = await supabase
    .from("watchlists")
    .select("id, name, direction, notes, created_at")
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (listError) {
    throw new Error(`Watchlists could not be loaded: ${listError.message}`);
  }

  const listRows = (listData ?? []) as WatchlistRow[];
  if (!listRows.length) {
    return { itemCount: 0, lists: [], sourceCount: 0 };
  }

  const listIds = listRows.map(({ id }) => id);
  const { data: itemData, error: itemError } = await supabase
    .from("watchlist_items")
    .select("id, watchlist_id, ticker_symbol, thesis, added_at")
    .eq("owner_id", ownerId)
    .in("watchlist_id", listIds)
    .is("archived_at", null)
    .order("added_at", { ascending: false });

  if (itemError) {
    throw new Error(`Watchlist items could not be loaded: ${itemError.message}`);
  }

  const itemRows = (itemData ?? []) as WatchlistItemRow[];
  const itemIds = itemRows.map(({ id }) => id);
  let sourceRows: WatchlistSourceRow[] = [];

  if (itemIds.length) {
    const { data: sourceData, error: sourceError } = await supabase
      .from("watchlist_item_sources")
      .select("watchlist_item_id, import_batch_id, direction, added_at")
      .eq("owner_id", ownerId)
      .in("watchlist_item_id", itemIds)
      .order("added_at", { ascending: false });

    if (sourceError) {
      throw new Error(
        `Watchlist provenance could not be loaded: ${sourceError.message}`,
      );
    }

    sourceRows = (sourceData ?? []) as WatchlistSourceRow[];
  }

  return buildWatchlistSnapshot(listRows, itemRows, sourceRows);
}
