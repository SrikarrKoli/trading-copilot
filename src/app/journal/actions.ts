"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import {
  JOURNAL_ENTRY_TYPES,
  STRATEGY_OPTIONS,
  TRADE_DIRECTIONS,
  TRADE_STATUSES,
  type JournalActionState,
} from "@/lib/journal/types";
import { getOptionJournalPrefill } from "@/lib/options/saved";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/;

function isAllowedValue<T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.includes(value as T[number]);
}

function optionalText(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value.length ? value : null;
}

function optionalNumber(
  formData: FormData,
  name: string,
): number | null | "invalid" {
  const value = String(formData.get(name) ?? "").trim();
  if (!value.length) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= 999_999_999_999
    ? parsed
    : "invalid";
}

function parseTags(value: FormDataEntryValue | null): string[] | null {
  const raw = String(value ?? "").trim();
  if (!raw.length) return [];
  const tags = [
    ...new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
  if (
    tags.length > 20 ||
    tags.some((tag) => tag.length > 40) ||
    tags.join("").length > 800
  ) {
    return null;
  }
  return tags;
}

async function getOwnerId(): Promise<string | null> {
  const claims = await getPermanentOwnerClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

function revalidateJournalViews() {
  revalidatePath("/journal");
  revalidatePath("/overview");
}

export async function createManualTrade(
  _previousState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const ownerId = await getOwnerId();
  if (!ownerId) {
    return {
      message: "Your session expired. Sign in again before saving a trade.",
      status: "error",
    };
  }

  const sourceValue = String(formData.get("sourceWatchlistItemId") ?? "");
  let sourceWatchlistItemId = sourceValue.length ? sourceValue : null;
  const optionIllustrationValue = String(
    formData.get("optionIllustrationId") ?? "",
  );
  const optionIllustrationId = optionIllustrationValue.length
    ? optionIllustrationValue
    : null;
  let symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const status = String(formData.get("status") ?? "");
  let direction = String(formData.get("direction") ?? "");
  let strategyType = String(formData.get("strategyType") ?? "");
  const thesis = String(formData.get("thesis") ?? "").trim();
  const tradePlan = String(formData.get("tradePlan") ?? "").trim();
  const reasonsWrong = String(formData.get("reasonsWrong") ?? "").trim();
  const note = optionalText(formData, "note");
  const tags = parseTags(formData.get("tags"));
  let intendedRisk = optionalNumber(formData, "intendedRisk");
  let entryNetValue = optionalNumber(formData, "entryNetValue");
  const exitNetValue = optionalNumber(formData, "exitNetValue");
  let fees = optionalNumber(formData, "fees");
  const realizedPnl = optionalNumber(formData, "realizedPnl");
  const strategyValues = STRATEGY_OPTIONS.map(({ value }) => value);

  if (optionIllustrationId) {
    if (!UUID_PATTERN.test(optionIllustrationId)) {
      return {
        message: "The linked strategy snapshot is invalid.",
        status: "error",
      };
    }

    let prefill;
    try {
      prefill = await getOptionJournalPrefill(optionIllustrationId);
    } catch {
      prefill = null;
    }
    if (!prefill) {
      return {
        message:
          "The linked strategy snapshot is unavailable. Return to Strategy Lab and choose it again.",
        status: "error",
      };
    }

    sourceWatchlistItemId = null;
    symbol = prefill.symbol;
    direction = prefill.direction;
    strategyType = prefill.strategy;
    intendedRisk = prefill.intendedRisk;
    entryNetValue = prefill.entryNetValue;
    fees = prefill.estimatedFees;
  }

  if (
    (optionIllustrationId !== null &&
      sourceWatchlistItemId !== null) ||
    (!sourceWatchlistItemId && !TICKER_PATTERN.test(symbol)) ||
    (sourceWatchlistItemId !== null &&
      !UUID_PATTERN.test(sourceWatchlistItemId)) ||
    !isAllowedValue(TRADE_STATUSES, status) ||
    !isAllowedValue(TRADE_DIRECTIONS, direction) ||
    !isAllowedValue(strategyValues, strategyType) ||
    !thesis.length ||
    thesis.length > 4000 ||
    !tradePlan.length ||
    tradePlan.length > 4000 ||
    !reasonsWrong.length ||
    reasonsWrong.length > 4000 ||
    (note?.length ?? 0) > 4000 ||
    tags === null ||
    [intendedRisk, entryNetValue, exitNetValue, fees, realizedPnl].includes(
      "invalid",
    ) ||
    (typeof intendedRisk === "number" && intendedRisk < 0) ||
    (typeof fees === "number" && fees < 0)
  ) {
    return {
      message:
        "Check the required plan fields, classification, tags, and numeric values.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const commonParameters = {
    p_direction: direction,
    p_entry_net_value: entryNetValue,
    p_exit_net_value: exitNetValue,
    p_fees: fees,
    p_intended_risk: intendedRisk,
    p_note: note,
    p_realized_pnl: realizedPnl,
    p_reasons_wrong: reasonsWrong,
    p_status: status,
    p_strategy_type: strategyType,
    p_tags: tags,
    p_thesis: thesis,
    p_trade_plan: tradePlan,
  };
  const { error } = optionIllustrationId
    ? await supabase.rpc("create_manual_trade_from_option_illustration", {
        ...commonParameters,
        p_option_illustration_id: optionIllustrationId,
        p_ticker_symbol: symbol,
      })
    : await supabase.rpc("create_manual_trade", {
        ...commonParameters,
        p_source_watchlist_item_id: sourceWatchlistItemId,
        p_ticker_symbol: sourceWatchlistItemId ? null : symbol,
      });

  if (error) {
    return {
      message:
        "The trade was not created. Confirm the watchlist source is still active and try again.",
      status: "error",
    };
  }

  revalidateJournalViews();
  revalidatePath("/strategy-lab");
  return {
    message: `${optionIllustrationId ? "The strategy snapshot" : sourceWatchlistItemId ? "The linked symbol" : symbol} was added to the journal.`,
    status: "success",
  };
}

export async function appendManualTradeEvent(
  _previousState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const ownerId = await getOwnerId();
  if (!ownerId) {
    return {
      message: "Your session expired. Sign in again before adding an entry.",
      status: "error",
    };
  }

  const tradeId = String(formData.get("tradeId") ?? "");
  const entryType = String(formData.get("entryType") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = optionalText(formData, "note");
  const thesis = optionalText(formData, "thesis");
  const tradePlan = optionalText(formData, "tradePlan");
  const reasonsWrong = optionalText(formData, "reasonsWrong");
  const mistakes = optionalText(formData, "mistakes");
  const lessons = optionalText(formData, "lessons");
  const tags = formData.has("tags") ? parseTags(formData.get("tags")) : null;
  const intendedRisk = optionalNumber(formData, "intendedRisk");
  const entryNetValue = optionalNumber(formData, "entryNetValue");
  const exitNetValue = optionalNumber(formData, "exitNetValue");
  const fees = optionalNumber(formData, "fees");
  const realizedPnl = optionalNumber(formData, "realizedPnl");

  if (
    !UUID_PATTERN.test(tradeId) ||
    !isAllowedValue(JOURNAL_ENTRY_TYPES, entryType) ||
    entryType === "plan_created" ||
    !isAllowedValue(TRADE_STATUSES, status) ||
    [note, thesis, tradePlan, reasonsWrong, mistakes, lessons].some(
      (value) => (value?.length ?? 0) > 4000,
    ) ||
    tags === null && formData.has("tags") ||
    [intendedRisk, entryNetValue, exitNetValue, fees, realizedPnl].includes(
      "invalid",
    ) ||
    (typeof intendedRisk === "number" && intendedRisk < 0) ||
    (typeof fees === "number" && fees < 0)
  ) {
    return {
      message: "Check the journal entry and numeric values, then try again.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("append_manual_trade_event", {
    p_entry_net_value: entryNetValue,
    p_entry_type: entryType,
    p_exit_net_value: exitNetValue,
    p_fees: fees,
    p_intended_risk: intendedRisk,
    p_lessons: lessons,
    p_mistakes: mistakes,
    p_note: note,
    p_realized_pnl: realizedPnl,
    p_reasons_wrong: reasonsWrong,
    p_status: status,
    p_tags: tags,
    p_thesis: thesis,
    p_trade_id: tradeId,
    p_trade_plan: tradePlan,
  });

  if (error) {
    return {
      message:
        "The journal event was not recorded. Confirm the status transition and try again.",
      status: "error",
    };
  }

  revalidateJournalViews();
  return { message: "The journal event was recorded.", status: "success" };
}
