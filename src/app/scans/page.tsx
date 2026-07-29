import { Archive, ChartNoAxesCombined } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ScanWorkspace } from "@/components/scan-workspace";
import {
  MetricStrip,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceNotice,
} from "@/components/workspace-chrome";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { getScanSnapshot } from "@/lib/scan/data";

export default async function ScansPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  try {
    snapshot = await getScanSnapshot();
  } catch (error) {
    return (
      <AppShell activeItem="Scans">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
          <WorkspaceError
            message={
              error instanceof Error
                ? error.message
                : "The scan workspace could not be loaded."
            }
            title="Saved scans are unavailable"
          />
        </div>
      </AppShell>
    );
  }

  const savedSymbols = snapshot.runs.reduce(
    (total, run) => total + run.results.length,
    0,
  );

  return (
    <AppShell activeItem="Scans">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            description="Save today's imported universe before tomorrow replaces it. Definition versions preserve the intended scanner logic beside every immutable snapshot."
            eyebrow="Scanner archive"
            icon={ChartNoAxesCombined}
            title="Preserve what the scanner showed."
          />
          <div className="mt-5">
            <MetricStrip
              metrics={[
                {
                  detail: "Versioned scanner contracts",
                  label: "Definitions",
                  tone: "info",
                  value: snapshot.definitions.length,
                },
                {
                  detail: "Immutable saved runs",
                  label: "Snapshots",
                  value: snapshot.runs.length,
                },
                {
                  detail: "Across saved snapshots",
                  label: "Saved symbols",
                  tone: "accent",
                  value: savedSymbols,
                },
              ]}
            />
          </div>
          <div className="mt-4">
            <WorkspaceNotice icon={Archive} tone="warning">
              Candidate order preserves workbook order only. It is not a score,
              confidence level, recommendation rank, or validation result.
            </WorkspaceNotice>
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <ScanWorkspace
              currentSources={snapshot.currentSources}
              definitions={snapshot.definitions}
              runs={snapshot.runs}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
