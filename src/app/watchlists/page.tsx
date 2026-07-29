import { Layers3 } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { WatchlistWorkspace } from "@/components/watchlist-workspace";
import {
  MetricStrip,
  WorkspaceError,
  WorkspaceHeader,
} from "@/components/workspace-chrome";
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
      <AppShell activeItem="Watchlists">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
          <WorkspaceError
            message={
              error instanceof Error
                ? error.message
                : "The active watchlists could not be loaded."
            }
            title="Watchlists are unavailable"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeItem="Watchlists">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            description="View and manage saved symbols that remain after daily scanner rollover."
            eyebrow="Workspace / Watchlists"
            icon={Layers3}
            title="Watchlists"
          />
          <div className="mt-5">
            <MetricStrip
              metrics={[
                {
                  detail: "Active research collections",
                  label: "Lists",
                  value: snapshot.lists.length,
                },
                {
                  detail: "Distinct saved ideas",
                  label: "Symbols",
                  tone: "accent",
                  value: snapshot.itemCount,
                },
                {
                  detail: "Preserved scanner origins",
                  label: "Sources",
                  tone: "info",
                  value: snapshot.sourceCount,
                },
              ]}
            />
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <WatchlistWorkspace lists={snapshot.lists} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
