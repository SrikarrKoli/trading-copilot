import { Scale, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StrategyLab } from "@/components/strategy-lab";
import {
  MetricStrip,
  WorkspaceHeader,
  WorkspaceNotice,
} from "@/components/workspace-chrome";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { getSavedOptionIllustrations } from "@/lib/options/saved";
import { resolveStrategyLabSource } from "@/lib/options/source";
import { strategySourceRequestFromSearchParams } from "@/lib/options/source-request";

export default async function StrategyLabPage({
  searchParams,
}: {
  searchParams: Promise<{
    direction?: string | string[];
    importBatch?: string | string[];
    symbol?: string | string[];
    watchlistItem?: string | string[];
  }>;
}) {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }
  const sourceParams = await searchParams;
  const sourceRequest = strategySourceRequestFromSearchParams(sourceParams);
  const sourceWasRequested = Boolean(
    sourceParams.watchlistItem ||
      sourceParams.importBatch ||
      sourceParams.direction ||
      sourceParams.symbol,
  );
  const [savedIllustrations, initialSource] = await Promise.all([
    getSavedOptionIllustrations(),
    sourceRequest
      ? resolveStrategyLabSource(sourceRequest)
      : Promise.resolve(null),
  ]);

  return (
    <AppShell activeItem="Strategy Lab">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            description="Calculate and compare manual expiration payoff scenarios."
            eyebrow="Workspace / Strategy Lab"
            icon={Scale}
            title="Strategy Lab"
          />
          <div className="mt-5">
            <MetricStrip
              metrics={[
                {
                  detail: "Immutable assumption sets",
                  label: "Saved scenarios",
                  tone: "info",
                  value: savedIllustrations.length,
                },
                {
                  detail: initialSource
                    ? "Linked candidate context"
                    : "Enter assumptions directly",
                  label: "Input source",
                  tone: initialSource ? "accent" : "neutral",
                  value: initialSource ? "Prefilled" : "Manual",
                },
                {
                  detail: "Analysis and journaling only",
                  label: "Broker actions",
                  value: "None",
                },
              ]}
            />
          </div>
          <div className="mt-4">
            <WorkspaceNotice icon={ShieldAlert} tone="warning">
              Expiration payoff is not a forecast of pre-expiration value.
              Quotes may be stale; Greeks, probability, taxes, assignment, and
              broker margin are not modeled.
            </WorkspaceNotice>
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <StrategyLab
              initialSource={initialSource}
              savedIllustrations={savedIllustrations}
              sourceUnavailable={sourceWasRequested && !initialSource}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
