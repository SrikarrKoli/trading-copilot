import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EvidenceWorkspace } from "@/components/evidence-workspace";
import { EvidenceIcon } from "@/components/focus-grid-icons";
import {
  MetricStrip,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceNotice,
} from "@/components/workspace-chrome";
import { getPermanentOwnerClaims, hasOwnerAccess } from "@/lib/auth/owner";
import { getDashboardSnapshot } from "@/lib/dashboard/data";
import { getLatestEvidenceAssessmentsForOwner } from "@/lib/evidence/data";
import { SETUP_ALIGNMENT_VERSION } from "@/lib/evidence/score";

export default async function EvidencePage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  let assessments;
  try {
    const [dashboardSnapshot, claims] = await Promise.all([
      getDashboardSnapshot(),
      getPermanentOwnerClaims(),
    ]);
    const ownerId = typeof claims?.sub === "string" ? claims.sub : null;
    if (!ownerId) {
      throw new Error("The authenticated owner session is unavailable.");
    }

    const currentCandidates = [
      ...dashboardSnapshot.candidates.bullish,
      ...dashboardSnapshot.candidates.bearish,
    ];
    snapshot = dashboardSnapshot;
    assessments = await getLatestEvidenceAssessmentsForOwner(
      ownerId,
      currentCandidates,
    );
  } catch (error) {
    return (
      <AppShell activeItem="Scanner">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
          <WorkspaceError
            message={
              error instanceof Error
                ? error.message
                : "The evidence workspace could not be loaded."
            }
            title="Candidate evidence is unavailable"
          />
        </div>
      </AppShell>
    );
  }

  const candidates = [
    ...snapshot.candidates.bullish,
    ...snapshot.candidates.bearish,
  ];

  return (
    <AppShell activeItem="Scanner">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            description="Enter the ten sourced inputs used to calculate Setup Alignment."
            eyebrow="Workspace / Evidence"
            icon={EvidenceIcon}
            title="Evidence"
          />
          <div className="mt-5">
            <MetricStrip
              metrics={[
                {
                  detail: "Current imported universe",
                  label: "Candidates",
                  value: candidates.length,
                },
                {
                  detail: "Explicit versioned checks",
                  label: "Rules",
                  value: 10,
                },
                {
                  detail: "Scoring contract",
                  label: "Version",
                  tone: "info",
                  value: SETUP_ALIGNMENT_VERSION.replace(
                    "manual-high-conviction-",
                    "",
                  ),
                },
              ]}
            />
          </div>
          <div className="mt-4">
            <WorkspaceNotice icon={ShieldAlert} tone="warning">
              Setup Alignment is deterministic rule matching—not probability,
              expected return, or an instruction to buy. Only complete
              assessments with a source and timestamp can be saved.
            </WorkspaceNotice>
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <EvidenceWorkspace
              candidates={candidates}
              initialAssessments={assessments}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
