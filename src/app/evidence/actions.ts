"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import type { SavedEvidenceAssessment } from "@/lib/evidence/data";
import {
  calculateSetupAlignment,
  EvidenceInputError,
  SETUP_ALIGNMENT_VERSION,
  type ManualEvidenceInput,
} from "@/lib/evidence/score";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/;

export interface SaveEvidenceAssessmentInput extends ManualEvidenceInput {
  importBatchId: string;
}

export interface SaveEvidenceAssessmentState {
  assessment: SavedEvidenceAssessment | null;
  message: string;
  status: "error" | "success";
}

interface InsertedAssessmentRow {
  direction: "bullish" | "bearish";
  id: string;
  import_batch_id: string;
  observation_source: string;
  observation_timestamp: string;
  saved_at: string;
  score_version: string;
  setup_alignment: number | string;
  ticker_symbol: string;
}

function errorState(message: string): SaveEvidenceAssessmentState {
  return { assessment: null, message, status: "error" };
}

export async function saveManualEvidenceAssessment(
  input: SaveEvidenceAssessmentInput,
): Promise<SaveEvidenceAssessmentState> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!ownerId) {
    return errorState(
      "Your session expired. Sign in again before saving evidence.",
    );
  }

  const symbol = input.symbol.trim().toUpperCase();
  const sourceLabel = input.sourceLabel?.trim() ?? "";
  const observationDate = input.observationTime
    ? new Date(input.observationTime)
    : null;

  if (
    !UUID_PATTERN.test(input.importBatchId) ||
    !TICKER_PATTERN.test(symbol) ||
    !["bullish", "bearish"].includes(input.direction) ||
    !sourceLabel.length ||
    sourceLabel.length > 120 ||
    !observationDate ||
    Number.isNaN(observationDate.getTime())
  ) {
    return errorState(
      "Add a valid observation time and source before saving this assessment.",
    );
  }

  let result;
  try {
    result = calculateSetupAlignment({ ...input, symbol });
  } catch (caught) {
    return errorState(
      caught instanceof EvidenceInputError
        ? caught.message
        : "The evidence could not be recalculated on the server.",
    );
  }

  if (!result.complete || result.score === null) {
    return errorState(
      "All ten evidence components are required before saving.",
    );
  }

  const supabase = await createClient();
  const sourceTable =
    input.direction === "bullish" ? "bullish_stocks" : "bearish_stocks";
  const { data: candidate, error: candidateError } = await supabase
    .from(sourceTable)
    .select("original_row_number")
    .eq("owner_id", ownerId)
    .eq("import_batch_id", input.importBatchId)
    .eq("ticker_symbol", symbol)
    .in("validation_status", ["valid", "duplicate"])
    .order("original_row_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (candidateError || !candidate) {
    return errorState(
      "This stock is no longer in the current imported list. Refresh before saving.",
    );
  }

  const completeInput = input as ManualEvidenceInput & {
    adx: number;
    atrPercent: number;
    averageVolumeMillions: number;
    ema20: number;
    ema50: number;
    macdSignal: NonNullable<ManualEvidenceInput["macdSignal"]>;
    marketCapBillions: number;
    price: number;
    rangeReference20Day: number;
    rsi: number;
  };
  const { data, error } = await supabase
    .from("manual_evidence_assessments")
    .insert({
      adx: completeInput.adx,
      atr_percent: completeInput.atrPercent,
      average_volume_millions: completeInput.averageVolumeMillions,
      direction: input.direction,
      ema_20: completeInput.ema20,
      ema_50: completeInput.ema50,
      import_batch_id: input.importBatchId,
      macd_signal: completeInput.macdSignal,
      market_cap_billions: completeInput.marketCapBillions,
      observation_source: sourceLabel,
      observation_timestamp: observationDate.toISOString(),
      owner_id: ownerId,
      price: completeInput.price,
      range_reference_20_day: completeInput.rangeReference20Day,
      rsi: completeInput.rsi,
      score_version: SETUP_ALIGNMENT_VERSION,
      source_row_number: candidate.original_row_number,
      ticker_symbol: symbol,
    })
    .select(
      "id, import_batch_id, direction, ticker_symbol, score_version, setup_alignment, observation_timestamp, observation_source, saved_at",
    )
    .single();

  if (error || !data) {
    return errorState(
      "The evidence snapshot was not saved. No success was assumed.",
    );
  }

  const row = data as InsertedAssessmentRow;
  const databaseScore = Number(row.setup_alignment);
  if (databaseScore !== result.score) {
    return errorState(
      "The database score did not match the server calculation. Stop using this assessment until the score versions are reconciled.",
    );
  }

  revalidatePath("/evidence");
  revalidatePath("/reviews");

  return {
    assessment: {
      direction: row.direction,
      id: row.id,
      importBatchId: row.import_batch_id,
      observationSource: row.observation_source,
      observationTimestamp: row.observation_timestamp,
      savedAt: row.saved_at,
      score: databaseScore,
      scoreVersion: row.score_version,
      symbol: row.ticker_symbol,
    },
    message: `${symbol} Setup Alignment ${databaseScore}/100 was saved.`,
    status: "success",
  };
}
