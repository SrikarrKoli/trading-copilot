"use server";

import { revalidatePath } from "next/cache";

import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { createClient } from "@/lib/supabase/server";
import {
  WATCHLIST_DIRECTIONS,
  type WatchlistActionState,
} from "@/lib/watchlist/types";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

async function getOwnerId(): Promise<string | null> {
  const claims = await getPermanentOwnerClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

function revalidateWatchlistViews() {
  revalidatePath("/overview");
  revalidatePath("/reviews");
  revalidatePath("/watchlists");
}

export async function createWatchlist(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  const ownerId = await getOwnerId();
  if (!ownerId) {
    return {
      message: "Your session expired. Sign in again before creating a list.",
      status: "error",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const direction = String(formData.get("direction") ?? "");
  const notesValue = String(formData.get("notes") ?? "").trim();
  const notes = notesValue.length ? notesValue : null;

  if (
    name.length < 1 ||
    name.length > 80 ||
    !WATCHLIST_DIRECTIONS.includes(
      direction as (typeof WATCHLIST_DIRECTIONS)[number],
    ) ||
    (notes?.length ?? 0) > 2000
  ) {
    return {
      message: "Use a name up to 80 characters and a valid list type.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("watchlists").insert({
    direction,
    name,
    notes,
    owner_id: ownerId,
  });

  if (error) {
    return {
      message:
        error.code === "23505"
          ? "An active watchlist already uses that name."
          : "The watchlist was not created. No success was assumed.",
      status: "error",
    };
  }

  revalidateWatchlistViews();
  return { message: `${name} was created.`, status: "success" };
}

export async function archiveWatchlist(formData: FormData): Promise<void> {
  const ownerId = await getOwnerId();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  if (!ownerId || !UUID_PATTERN.test(watchlistId)) {
    throw new Error("The watchlist could not be verified.");
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlists")
    .update({ archived_at: now, updated_at: now })
    .eq("id", watchlistId)
    .eq("owner_id", ownerId)
    .is("archived_at", null);

  if (error) {
    throw new Error("The watchlist was not archived.");
  }

  revalidateWatchlistViews();
}

export async function archiveWatchlistItem(
  formData: FormData,
): Promise<void> {
  const ownerId = await getOwnerId();
  const itemId = String(formData.get("itemId") ?? "");
  if (!ownerId || !UUID_PATTERN.test(itemId)) {
    throw new Error("The watchlist item could not be verified.");
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlist_items")
    .update({ archived_at: now })
    .eq("id", itemId)
    .eq("owner_id", ownerId)
    .is("archived_at", null);

  if (error) {
    throw new Error("The watchlist item was not archived.");
  }

  revalidateWatchlistViews();
}
