"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { OPTION_ENGINE_VERSION, OptionInputError } from "@/lib/options/payoff";
import { resolveStrategyLabSource } from "@/lib/options/source";
import { parseStrategyLabSourceRequest } from "@/lib/options/source-request";
import { parseOptionIllustrationInput } from "@/lib/options/validation";
import { createClient } from "@/lib/supabase/server";

export interface SaveOptionIllustrationState {
  message: string;
  savedId: string | null;
  status: "idle" | "error" | "success";
}

export async function saveOptionIllustration(
  _previousState: SaveOptionIllustrationState,
  formData: FormData,
): Promise<SaveOptionIllustrationState> {
  const claims = await getPermanentOwnerClaims();
  if (typeof claims?.sub !== "string") {
    return {
      message: "Your session expired. Sign in again before saving.",
      savedId: null,
      status: "error",
    };
  }

  let input;
  try {
    input = parseOptionIllustrationInput(
      JSON.parse(String(formData.get("illustrationInput") ?? "")),
    );
  } catch (error) {
    return {
      message:
        error instanceof OptionInputError
          ? error.message
          : "The option illustration payload is invalid.",
      savedId: null,
      status: "error",
    };
  }

  const sourcePayload = String(formData.get("strategySource") ?? "").trim();
  let source = null;
  if (sourcePayload.length) {
    let sourceRequest;
    try {
      sourceRequest = parseStrategyLabSourceRequest(JSON.parse(sourcePayload));
    } catch {
      sourceRequest = null;
    }
    if (!sourceRequest) {
      return {
        message: "The Strategy Lab source is invalid. Open it again from Reviews or Watchlists.",
        savedId: null,
        status: "error",
      };
    }

    try {
      source = await resolveStrategyLabSource(sourceRequest);
    } catch {
      source = null;
    }
    if (!source || source.symbol !== input.symbol) {
      return {
        message:
          "The linked source is no longer available or its symbol changed. Open Strategy Lab from the source again.",
        savedId: null,
        status: "error",
      };
    }
  }

  const supabase = await createClient();
  const illustrationParameters = {
    p_engine_version: OPTION_ENGINE_VERSION,
    p_estimated_fees: input.estimatedFees,
    p_expiry: input.expiry,
    p_legs: input.legs,
    p_pricing_mode: input.pricingMode,
    p_quote_time: input.quoteTime,
    p_spot_price: input.spotPrice,
    p_strategy: input.strategy,
    p_ticker_symbol: input.symbol,
  };
  const { data, error } = source
    ? await supabase.rpc("save_sourced_option_illustration", {
        ...illustrationParameters,
        p_direction: source.direction,
        p_evidence_assessment_id: source.evidenceAssessmentId,
        p_import_batch_id: source.importBatchId,
        p_source_kind: source.kind,
        p_source_row_number: source.sourceRow,
        p_watchlist_item_id: source.watchlistItemId,
      })
    : await supabase.rpc("save_option_illustration", illustrationParameters);

  if (error || typeof data !== "string") {
    return {
      message: "The illustration was not saved. Check the inputs and try again.",
      savedId: null,
      status: "error",
    };
  }

  revalidatePath("/strategy-lab");
  revalidatePath("/reviews");
  return {
    message: "Saved as an immutable strategy snapshot.",
    savedId: data,
    status: "success",
  };
}
