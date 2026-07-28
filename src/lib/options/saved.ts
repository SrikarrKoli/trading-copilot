import "server-only";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import {
  calculateOptionIllustration,
  OPTION_ENGINE_VERSION,
  STRATEGY_META,
  type OptionIllustration,
  type OptionIllustrationInput,
  type OptionLegInput,
  type PricingMode,
  type StrategyKind,
} from "@/lib/options/payoff";
import type { SavedOptionSource } from "@/lib/options/source-types";
import { createClient } from "@/lib/supabase/server";

interface IllustrationRow {
  created_at: string;
  engine_version: string;
  estimated_fees: number | string;
  expiry: string;
  id: string;
  pricing_mode: PricingMode;
  quote_time: string | null;
  spot_price: number | string;
  strategy: StrategyKind;
  ticker_symbol: string;
}

interface IllustrationLegRow {
  ask: number | string;
  bid: number | string;
  illustration_id: string;
  leg_order: number;
  manual_fill: number | string | null;
  multiplier: number;
  option_type: OptionLegInput["optionType"];
  quantity: number;
  side: OptionLegInput["side"];
  strike: number | string;
}

interface IllustrationSourceRow {
  direction: SavedOptionSource["direction"];
  evidence_assessment_id: string | null;
  illustration_id: string;
  import_batch_id: string;
  source_kind: SavedOptionSource["kind"];
  source_row_number: number;
  watchlist_item_id: string | null;
}

export interface SavedOptionIllustration {
  createdAt: string;
  engineVersion: string;
  id: string;
  input: OptionIllustrationInput;
  result: OptionIllustration;
  source: SavedOptionSource | null;
}

export interface OptionJournalPrefill {
  direction: "bullish" | "bearish";
  entryNetValue: number;
  estimatedFees: number;
  expiry: string;
  illustrationId: string;
  intendedRisk: number;
  strategy: StrategyKind;
  symbol: string;
}

function toNumber(value: number | string): number {
  return Number(value);
}

function buildSavedIllustration(
  row: IllustrationRow,
  legRows: IllustrationLegRow[],
  source: SavedOptionSource | null,
): SavedOptionIllustration {
  if (row.engine_version !== OPTION_ENGINE_VERSION) {
    throw new Error(
      `Option engine ${row.engine_version} is not supported by this build.`,
    );
  }

  const input: OptionIllustrationInput = {
    estimatedFees: toNumber(row.estimated_fees),
    expiry: row.expiry,
    legs: legRows
      .filter(({ illustration_id }) => illustration_id === row.id)
      .sort((left, right) => left.leg_order - right.leg_order)
      .map((leg) => ({
        ask: toNumber(leg.ask),
        bid: toNumber(leg.bid),
        manualFill:
          leg.manual_fill === null ? null : toNumber(leg.manual_fill),
        multiplier: leg.multiplier,
        optionType: leg.option_type,
        quantity: leg.quantity,
        side: leg.side,
        strike: toNumber(leg.strike),
      })),
    pricingMode: row.pricing_mode,
    quoteTime: row.quote_time,
    spotPrice: toNumber(row.spot_price),
    strategy: row.strategy,
    symbol: row.ticker_symbol,
  };

  return {
    createdAt: row.created_at,
    engineVersion: row.engine_version,
    id: row.id,
    input,
    result: calculateOptionIllustration(input),
    source,
  };
}

async function getOwnerId(): Promise<string> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!ownerId) {
    throw new Error("The authenticated owner session is unavailable.");
  }
  return ownerId;
}

async function getLegRows(
  ownerId: string,
  illustrationIds: string[],
): Promise<IllustrationLegRow[]> {
  if (!illustrationIds.length) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("option_illustration_legs")
    .select(
      "illustration_id, leg_order, side, option_type, strike, bid, ask, manual_fill, quantity, multiplier",
    )
    .eq("owner_id", ownerId)
    .in("illustration_id", illustrationIds)
    .order("leg_order", { ascending: true });

  if (error) {
    throw new Error(`Saved option legs could not be loaded: ${error.message}`);
  }
  return (data ?? []) as IllustrationLegRow[];
}

async function getSourceMap(
  ownerId: string,
  illustrationIds: string[],
): Promise<Map<string, SavedOptionSource>> {
  if (!illustrationIds.length) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("option_illustration_sources")
    .select(
      "illustration_id, source_kind, watchlist_item_id, import_batch_id, direction, source_row_number, evidence_assessment_id",
    )
    .eq("owner_id", ownerId)
    .in("illustration_id", illustrationIds);

  if (error) {
    throw new Error(`Strategy source provenance could not be loaded: ${error.message}`);
  }

  const rows = (data ?? []) as IllustrationSourceRow[];
  const evidenceIds = rows.flatMap(({ evidence_assessment_id }) =>
    evidence_assessment_id ? [evidence_assessment_id] : [],
  );
  const evidenceScores = new Map<string, number>();

  if (evidenceIds.length) {
    const { data: evidenceData, error: evidenceError } = await supabase
      .from("manual_evidence_assessments")
      .select("id, setup_alignment")
      .eq("owner_id", ownerId)
      .in("id", evidenceIds);

    if (evidenceError) {
      throw new Error(
        `Strategy source evidence could not be loaded: ${evidenceError.message}`,
      );
    }
    for (const evidence of evidenceData ?? []) {
      evidenceScores.set(evidence.id, Number(evidence.setup_alignment));
    }
  }

  return new Map(
    rows.map((row) => [
      row.illustration_id,
      {
        direction: row.direction,
        evidenceAssessmentId: row.evidence_assessment_id,
        evidenceScore: row.evidence_assessment_id
          ? evidenceScores.get(row.evidence_assessment_id) ?? null
          : null,
        importBatchId: row.import_batch_id,
        kind: row.source_kind,
        sourceRow: row.source_row_number,
        watchlistItemId: row.watchlist_item_id,
      },
    ]),
  );
}

export async function getSavedOptionIllustrations(
  limit = 12,
): Promise<SavedOptionIllustration[]> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("option_illustrations")
    .select(
      "id, strategy, ticker_symbol, spot_price, expiry, quote_time, pricing_mode, estimated_fees, engine_version, created_at",
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      `Saved option illustrations could not be loaded: ${error.message}`,
    );
  }

  const rows = (data ?? []) as IllustrationRow[];
  const illustrationIds = rows.map(({ id }) => id);
  const [legs, sources] = await Promise.all([
    getLegRows(ownerId, illustrationIds),
    getSourceMap(ownerId, illustrationIds),
  ]);
  return rows.map((row) =>
    buildSavedIllustration(row, legs, sources.get(row.id) ?? null),
  );
}

export async function getSavedOptionIllustration(
  illustrationId: string,
): Promise<SavedOptionIllustration | null> {
  const ownerId = await getOwnerId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("option_illustrations")
    .select(
      "id, strategy, ticker_symbol, spot_price, expiry, quote_time, pricing_mode, estimated_fees, engine_version, created_at",
    )
    .eq("owner_id", ownerId)
    .eq("id", illustrationId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `The saved option illustration could not be loaded: ${error.message}`,
    );
  }
  if (!data) return null;

  const [legs, sources] = await Promise.all([
    getLegRows(ownerId, [illustrationId]),
    getSourceMap(ownerId, [illustrationId]),
  ]);
  return buildSavedIllustration(
    data as IllustrationRow,
    legs,
    sources.get(illustrationId) ?? null,
  );
}

export async function getOptionJournalPrefill(
  illustrationId: string,
): Promise<OptionJournalPrefill | null> {
  const saved = await getSavedOptionIllustration(illustrationId);
  if (!saved) return null;

  return {
    direction: STRATEGY_META[saved.input.strategy].direction,
    entryNetValue: saved.result.totalEntryCost,
    estimatedFees: saved.result.estimatedFees,
    expiry: saved.input.expiry,
    illustrationId: saved.id,
    intendedRisk: saved.result.maxLoss,
    strategy: saved.input.strategy,
    symbol: saved.input.symbol,
  };
}
