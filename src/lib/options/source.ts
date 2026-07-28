import "server-only";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import type {
  StrategyLabSource,
  StrategyLabSourceRequest,
  StrategySourceDirection,
} from "@/lib/options/source-types";
import { createClient } from "@/lib/supabase/server";

interface EvidenceSourceRow {
  id: string;
  setup_alignment: number | string;
}

async function getOwnerId(): Promise<string> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }
  return ownerId;
}

async function getLatestEvidence(
  ownerId: string,
  importBatchId: string,
  direction: StrategySourceDirection,
  symbol: string,
  sourceRow: number,
): Promise<EvidenceSourceRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manual_evidence_assessments")
    .select("id, setup_alignment")
    .eq("owner_id", ownerId)
    .eq("import_batch_id", importBatchId)
    .eq("direction", direction)
    .eq("ticker_symbol", symbol)
    .eq("source_row_number", sourceRow)
    .order("saved_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Strategy source evidence could not be loaded: ${error.message}`);
  }
  return data as EvidenceSourceRow | null;
}

export async function resolveStrategyLabSource(
  request: StrategyLabSourceRequest,
): Promise<StrategyLabSource | null> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();

  if (request.kind === "watchlist") {
    const { data: itemData, error: itemError } = await supabase
      .from("watchlist_items")
      .select("id, watchlist_id, ticker_symbol")
      .eq("owner_id", ownerId)
      .eq("id", request.watchlistItemId)
      .is("archived_at", null)
      .maybeSingle();

    if (itemError) {
      throw new Error(`The watchlist strategy source could not be loaded: ${itemError.message}`);
    }
    if (!itemData) return null;

    const [listResult, sourceResult] = await Promise.all([
      supabase
        .from("watchlists")
        .select("name")
        .eq("owner_id", ownerId)
        .eq("id", itemData.watchlist_id)
        .is("archived_at", null)
        .maybeSingle(),
      supabase
        .from("watchlist_item_sources")
        .select("import_batch_id, direction, source_row_number")
        .eq("owner_id", ownerId)
        .eq("watchlist_item_id", itemData.id)
        .order("added_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (listResult.error || sourceResult.error) {
      throw new Error(
        `The watchlist strategy source could not be loaded: ${
          listResult.error?.message ?? sourceResult.error?.message
        }`,
      );
    }
    if (!listResult.data || !sourceResult.data) return null;

    const direction = sourceResult.data
      .direction as StrategySourceDirection;
    const evidence = await getLatestEvidence(
      ownerId,
      sourceResult.data.import_batch_id,
      direction,
      itemData.ticker_symbol,
      sourceResult.data.source_row_number,
    );

    return {
      direction,
      evidenceAssessmentId: evidence?.id ?? null,
      evidenceScore: evidence ? Number(evidence.setup_alignment) : null,
      importBatchId: sourceResult.data.import_batch_id,
      kind: "watchlist",
      label: `Watchlist · ${listResult.data.name}`,
      request,
      sourceRow: sourceResult.data.source_row_number,
      symbol: itemData.ticker_symbol,
      watchlistItemId: itemData.id,
    };
  }

  const sourceTable =
    request.direction === "bullish" ? "bullish_stocks" : "bearish_stocks";
  const { data, error } = await supabase
    .from(sourceTable)
    .select("original_row_number")
    .eq("owner_id", ownerId)
    .eq("import_batch_id", request.importBatchId)
    .eq("ticker_symbol", request.symbol)
    .in("validation_status", ["valid", "duplicate"])
    .order("original_row_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`The review strategy source could not be loaded: ${error.message}`);
  }
  if (!data) return null;

  const evidence = await getLatestEvidence(
    ownerId,
    request.importBatchId,
    request.direction,
    request.symbol,
    data.original_row_number,
  );

  return {
    direction: request.direction,
    evidenceAssessmentId: evidence?.id ?? null,
    evidenceScore: evidence ? Number(evidence.setup_alignment) : null,
    importBatchId: request.importBatchId,
    kind: "review",
    label: "Reviews · current candidate",
    request,
    sourceRow: data.original_row_number,
    symbol: request.symbol,
    watchlistItemId: null,
  };
}
