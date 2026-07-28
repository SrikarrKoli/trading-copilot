import { AlertTriangle, Layers3 } from "lucide-react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { WatchlistWorkspace } from "@/components/watchlist-workspace";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { getWatchlistSnapshot } from "@/lib/watchlist/data";

export default async function WatchlistsPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  try {
    snapshot = await getWatchlistSnapshot();
  } catch (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Watchlists" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-danger"
              />
              <h1 className="mt-4 text-xl font-semibold">
                Watchlists are unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {error instanceof Error
                  ? error.message
                  : "The active watchlists could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Watchlists" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
                <Layers3 aria-hidden="true" className="size-3.5" />
                Persistent research
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Keep only the ideas worth following.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Daily imports replace the scanner queue. Named watchlists are
                deliberate collections that remain until you archive them.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 self-start md:self-auto">
              {[
                ["Lists", snapshot.lists.length],
                ["Symbols", snapshot.itemCount],
                ["Sources", snapshot.sourceCount],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-20 rounded-xl border border-border bg-card px-3 py-2.5 text-center"
                >
                  <p className="font-mono text-lg font-semibold">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <WatchlistWorkspace lists={snapshot.lists} />
        </div>
      </main>
    </div>
  );
}
