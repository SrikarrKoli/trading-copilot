"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import {
  SCAN_DIRECTIONS,
  SCAN_SESSIONS,
  VERSION_BUMPS,
  type ScanActionState,
} from "@/lib/scan/types";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const SCANNER_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function hasOwnerSession(): Promise<boolean> {
  const claims = await getPermanentOwnerClaims();
  return typeof claims?.sub === "string";
}

function allowed<T extends readonly string[]>(values: T, value: string) {
  return values.includes(value as T[number]);
}

export async function createScannerDefinition(
  _previousState: ScanActionState,
  formData: FormData,
): Promise<ScanActionState> {
  if (!(await hasOwnerSession())) {
    return {
      message: "Your session expired. Sign in again before saving a definition.",
      status: "error",
    };
  }

  const scannerKey = String(formData.get("scannerKey") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const direction = String(formData.get("direction") ?? "");
  const timeframe = String(formData.get("timeframe") ?? "").trim();
  const sessionScope = String(formData.get("sessionScope") ?? "");
  const ruleSummary = String(formData.get("ruleSummary") ?? "").trim();
  const changeNote = String(formData.get("changeNote") ?? "").trim();
  const bumpKind = String(formData.get("bumpKind") ?? "patch");

  if (
    !SCANNER_KEY_PATTERN.test(scannerKey) ||
    scannerKey.length > 80 ||
    !displayName.length ||
    displayName.length > 120 ||
    !allowed(SCAN_DIRECTIONS, direction) ||
    !timeframe.length ||
    timeframe.length > 80 ||
    !allowed(SCAN_SESSIONS, sessionScope) ||
    !ruleSummary.length ||
    ruleSummary.length > 4000 ||
    !changeNote.length ||
    changeNote.length > 1000 ||
    !allowed(VERSION_BUMPS, bumpKind)
  ) {
    return {
      message: "Check the stable key, classification, rule summary, and change note.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_scanner_definition_version", {
    p_bump_kind: bumpKind,
    p_change_note: changeNote,
    p_direction: direction,
    p_display_name: displayName,
    p_rule_summary: ruleSummary,
    p_scanner_key: scannerKey,
    p_session_scope: sessionScope,
    p_timeframe: timeframe,
  });

  if (error) {
    return {
      message:
        "The definition version was not created. Confirm the stable key and try again.",
      status: "error",
    };
  }

  revalidatePath("/scans");
  return {
    message: `${displayName} was saved as an experimental definition version.`,
    status: "success",
  };
}

export async function saveCurrentScan(
  _previousState: ScanActionState,
  formData: FormData,
): Promise<ScanActionState> {
  if (!(await hasOwnerSession())) {
    return {
      message: "Your session expired. Sign in again before saving a scan.",
      status: "error",
    };
  }

  const importBatchId = String(formData.get("importBatchId") ?? "");
  const scannerDefinitionId = String(
    formData.get("scannerDefinitionId") ?? "",
  );
  const name = String(formData.get("name") ?? "").trim();
  const notesValue = String(formData.get("notes") ?? "").trim();
  const notes = notesValue.length ? notesValue : null;

  if (
    !UUID_PATTERN.test(importBatchId) ||
    !UUID_PATTERN.test(scannerDefinitionId) ||
    !name.length ||
    name.length > 120 ||
    (notes?.length ?? 0) > 4000
  ) {
    return {
      message: "Choose a current import and compatible definition, then add a name.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_current_import_scan", {
    p_import_batch_id: importBatchId,
    p_name: name,
    p_notes: notes,
    p_scanner_definition_id: scannerDefinitionId,
  });

  if (error) {
    return {
      message:
        "The snapshot was not saved. The import may have been replaced or its direction may not match the definition.",
      status: "error",
    };
  }

  revalidatePath("/scans");
  revalidatePath("/overview");
  return {
    message: `${name} was saved as an immutable imported-candidate snapshot.`,
    status: "success",
  };
}
