"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { createClient } from "@/lib/supabase/server";
import {
  REVIEW_ACTIONS,
  REVIEW_REASONS,
  type ReviewAction,
  type ReviewActionState,
  type ReviewReason,
} from "@/lib/review/types";

const DIRECTIONS = ["bullish", "bearish"] as const;
const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function isAllowedValue<T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.includes(value as T[number]);
}

export async function recordReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const claims = await getPermanentOwnerClaims();
  const ownerId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!ownerId) {
    return {
      message: "Your session expired. Sign in again before recording a decision.",
      status: "error",
    };
  }

  const importBatchId = String(formData.get("importBatchId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const action = String(formData.get("action") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const noteValue = String(formData.get("note") ?? "").trim();
  const note = noteValue.length ? noteValue : null;

  const reasonValues = REVIEW_REASONS.map(({ value }) => value);

  if (
    !UUID_PATTERN.test(importBatchId) ||
    !isAllowedValue(DIRECTIONS, direction) ||
    !TICKER_PATTERN.test(symbol) ||
    !isAllowedValue(REVIEW_ACTIONS, action) ||
    !isAllowedValue(reasonValues, reasonCode) ||
    (note?.length ?? 0) > 2000
  ) {
    return {
      message: "Choose a valid action and reason, then try again.",
      status: "error",
    };
  }

  const supabase = await createClient();

  if (action === "watchlisted") {
    if (!UUID_PATTERN.test(watchlistId)) {
      return {
        message: "Choose a target watchlist before adding this candidate.",
        status: "error",
      };
    }

    const { error: assignmentError } = await supabase.rpc(
      "assign_candidate_to_watchlist",
      {
        p_direction: direction,
        p_import_batch_id: importBatchId,
        p_note: note,
        p_reason_code: reasonCode,
        p_ticker_symbol: symbol,
        p_watchlist_id: watchlistId,
      },
    );

    if (assignmentError) {
      return {
        message:
          "The candidate was not added. Refresh and confirm that both the candidate and watchlist are still active.",
        status: "error",
      };
    }

    revalidatePath("/overview");
    revalidatePath("/reviews");
    revalidatePath("/watchlists");
    return {
      message: `${symbol} was added to the selected watchlist.`,
      status: "success",
    };
  }

  const sourceTable =
    direction === "bullish" ? "bullish_stocks" : "bearish_stocks";
  const { data: candidate, error: candidateError } = await supabase
    .from(sourceTable)
    .select("original_row_number")
    .eq("owner_id", ownerId)
    .eq("import_batch_id", importBatchId)
    .eq("ticker_symbol", symbol)
    .in("validation_status", ["valid", "duplicate"])
    .order("original_row_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (candidateError || !candidate) {
    return {
      message:
        "This candidate is no longer in the current imported list. Refresh the queue.",
      status: "error",
    };
  }

  const { error: insertError } = await supabase.from("review_actions").insert({
    action: action as ReviewAction,
    direction,
    import_batch_id: importBatchId,
    note,
    owner_id: ownerId,
    reason_code: reasonCode as ReviewReason,
    source_row_number: candidate.original_row_number,
    ticker_symbol: symbol,
  });

  if (insertError) {
    return {
      message: "The decision was not recorded. No success was assumed.",
      status: "error",
    };
  }

  revalidatePath("/overview");
  revalidatePath("/reviews");
  revalidatePath("/watchlists");

  return {
    message: `${symbol} was marked ${action}.`,
    status: "success",
  };
}
