"use client";

import {
  Archive,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  FolderPlus,
  Layers3,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  archiveWatchlist,
  archiveWatchlistItem,
  createWatchlist,
} from "@/app/watchlists/actions";
import { ControlButton } from "@/components/ui/button";
import { strategyLabSourceHref } from "@/lib/options/source-request";
import {
  INITIAL_WATCHLIST_ACTION_STATE,
  type Watchlist,
  type WatchlistDirection,
} from "@/lib/watchlist/types";

const DIRECTION_META: Record<
  WatchlistDirection,
  { className: string; icon: typeof ArrowUpRight; label: string }
> = {
  bullish: {
    className: "bg-positive/10 text-positive",
    icon: ArrowUpRight,
    label: "Bullish",
  },
  bearish: {
    className: "bg-danger/10 text-danger",
    icon: ArrowDownRight,
    label: "Bearish",
  },
  research: {
    className: "bg-info/[0.07] text-info",
    icon: Beaker,
    label: "Research",
  },
};

function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} type="submit" className={className}>
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

function CreateWatchlistForm() {
  const [state, action, pending] = useActionState(
    createWatchlist,
    INITIAL_WATCHLIST_ACTION_STATE,
  );

  return (
    <form
      action={action}
      className="rounded-[24px] border border-white/[0.075] bg-card/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
          <FolderPlus aria-hidden="true" className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Create a named list</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Watchlists persist even when tomorrow&apos;s scanner candidates
            replace today&apos;s lists.
          </p>
        </div>
      </div>

      <fieldset disabled={pending} className="mt-5 grid gap-4">
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">Name</span>
          <input
            name="name"
            required
            maxLength={80}
            placeholder="High conviction"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            List type
          </span>
          <select
            name="direction"
            defaultValue="research"
            className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm"
          >
            <option value="research">Research</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-muted">
            Optional purpose
          </span>
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="What belongs in this collection?"
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm placeholder:text-muted/60"
          />
        </label>
        <ControlButton type="submit" tone="primary" className="gap-2 text-sm">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <FolderPlus aria-hidden="true" className="size-4" />
          )}
          Create watchlist
        </ControlButton>
      </fieldset>

      {state.message ? (
        <p
          aria-live="polite"
          className={`mt-4 text-xs ${
            state.status === "success" ? "text-accent" : "text-danger"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function WatchlistCard({ list }: { list: Watchlist }) {
  const meta = DIRECTION_META[list.direction];
  const DirectionIcon = meta.icon;

  return (
    <article className="scroll-reveal deferred-card overflow-hidden rounded-[24px] border border-white/[0.075] bg-card/90 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <header className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`grid size-9 shrink-0 place-items-center rounded-lg ${meta.className}`}
          >
            <DirectionIcon aria-hidden="true" className="size-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{list.name}</h2>
              <span className="rounded-full border border-white/[0.075] bg-black/15 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                {meta.label}
              </span>
            </div>
            {list.notes ? (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
                {list.notes}
              </p>
            ) : null}
          </div>
        </div>
        <form action={archiveWatchlist}>
          <input type="hidden" name="watchlistId" value={list.id} />
          <SubmitButton className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-muted transition hover:border-danger/30 hover:text-danger disabled:cursor-wait disabled:opacity-50">
            <Archive aria-hidden="true" className="size-3.5" />
            Archive list
          </SubmitButton>
        </form>
      </header>

      {list.items.length ? (
        <ol>
          {list.items.map((item) => (
            <li
              key={item.id}
              className="interactive-row flex flex-col gap-3 border-b border-white/[0.055] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:px-6"
            >
              <div>
                <p className="font-mono text-sm font-semibold tracking-wide">
                  {item.symbol}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {item.sourceCount} scanner{" "}
                  {item.sourceCount === 1 ? "source" : "sources"}
                  {item.latestSource
                    ? ` · latest ${item.latestSource.direction} import ${item.latestSource.importBatchId.slice(0, 8)}`
                    : ""}
                </p>
                {item.thesis ? (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {item.thesis}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <Link
                  href={strategyLabSourceHref({
                    kind: "watchlist",
                    watchlistItemId: item.id,
                  })}
                  className="inline-flex items-center gap-2 rounded-xl border border-info/20 bg-info/[0.055] px-3 py-2 text-xs font-medium text-[#c6cff2] transition hover:-translate-y-0.5 hover:bg-info/10"
                >
                  Build strategy
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
                <form action={archiveWatchlistItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <SubmitButton className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-muted transition hover:border-danger/30 hover:text-danger disabled:cursor-wait disabled:opacity-50">
                    <Archive aria-hidden="true" className="size-3.5" />
                    Archive symbol
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-5 py-10 text-center">
          <Layers3 aria-hidden="true" className="mx-auto size-5 text-muted" />
          <p className="mt-3 text-sm">This watchlist is empty.</p>
          <p className="mt-1 text-xs text-muted">
            Add a current candidate from Reviews.
          </p>
        </div>
      )}
    </article>
  );
}

export function WatchlistWorkspace({ lists }: { lists: Watchlist[] }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <CreateWatchlistForm />
      <section aria-label="Active watchlists" className="grid gap-4">
        {lists.length ? (
          lists.map((list) => <WatchlistCard key={list.id} list={list} />)
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-card/45 px-5 py-16 text-center">
            <Layers3 aria-hidden="true" className="mx-auto size-6 text-muted" />
            <h2 className="mt-4 text-sm font-semibold">No active watchlists</h2>
            <p className="mt-2 text-xs text-muted">
              Create the first named collection, then add candidates from
              Reviews.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
