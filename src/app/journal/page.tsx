import { CircleDollarSign } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { JournalIcon } from "@/components/focus-grid-icons";
import { JournalWorkspace } from "@/components/journal-workspace";
import {
  MetricStrip,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceNotice,
} from "@/components/workspace-chrome";
import { hasOwnerAccess } from "@/lib/auth/owner";
import {
  getJournalSnapshot,
  getJournalSourceOptions,
} from "@/lib/journal/data";
import { getOptionJournalPrefill } from "@/lib/options/saved";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function formatPnl(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: "always",
    style: "currency",
  }).format(value);
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    illustration?: string | string[];
  }>;
}) {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  let sourceOptions;
  let initialIllustration = null;
  try {
    const illustrationValue = (await searchParams).illustration;
    const illustrationId =
      typeof illustrationValue === "string" &&
      UUID_PATTERN.test(illustrationValue)
        ? illustrationValue
        : null;
    [snapshot, sourceOptions, initialIllustration] = await Promise.all([
      getJournalSnapshot(),
      getJournalSourceOptions(),
      illustrationId
        ? getOptionJournalPrefill(illustrationId)
        : Promise.resolve(null),
    ]);
  } catch (error) {
    return (
      <AppShell activeItem="Journal">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
          <WorkspaceError
            message={
              error instanceof Error
                ? error.message
                : "The trade journal could not be loaded."
            }
            title="Journal is unavailable"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeItem="Journal">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            description="Create and review private manual trade records."
            eyebrow="Workspace / Journal"
            icon={JournalIcon}
            title="Journal"
          />
          <div className="mt-5">
            <MetricStrip
              metrics={[
                {
                  detail: "All journal records",
                  label: "All",
                  value: snapshot.counts.all,
                },
                {
                  detail: "Awaiting execution",
                  label: "Planned",
                  tone: "info",
                  value: snapshot.counts.planned,
                },
                {
                  detail: "Active manual records",
                  label: "Open",
                  tone: "warning",
                  value: snapshot.counts.open,
                },
                {
                  detail: "Manually recorded",
                  label: "Closed P/L",
                  tone:
                    snapshot.realizedPnl > 0
                      ? "accent"
                      : snapshot.realizedPnl < 0
                        ? "danger"
                        : "neutral",
                  value: formatPnl(snapshot.realizedPnl),
                },
              ]}
            />
          </div>
          <div className="mt-4">
            <WorkspaceNotice icon={CircleDollarSign} tone="warning">
              Debit paid is recorded as positive; credit received is negative.
              P/L is your manual result—not a broker-reconciled calculation.
            </WorkspaceNotice>
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <JournalWorkspace
              initialIllustration={initialIllustration}
              sourceOptions={sourceOptions}
              trades={snapshot.trades}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
