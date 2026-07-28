"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { OPTION_ENGINE_VERSION, OptionInputError } from "@/lib/options/payoff";
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

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_option_illustration", {
    p_engine_version: OPTION_ENGINE_VERSION,
    p_estimated_fees: input.estimatedFees,
    p_expiry: input.expiry,
    p_legs: input.legs,
    p_pricing_mode: input.pricingMode,
    p_quote_time: input.quoteTime,
    p_spot_price: input.spotPrice,
    p_strategy: input.strategy,
    p_ticker_symbol: input.symbol,
  });

  if (error || typeof data !== "string") {
    return {
      message: "The illustration was not saved. Check the inputs and try again.",
      savedId: null,
      status: "error",
    };
  }

  revalidatePath("/strategy-lab");
  return {
    message: "Saved as an immutable strategy snapshot.",
    savedId: data,
    status: "success",
  };
}
