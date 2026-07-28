import { AlertTriangle, Gauge } from "lucide-react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { EvidenceWorkspace } from "@/components/evidence-workspace";
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
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Evidence" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-danger"
              />
              <h1 className="mt-4 text-xl font-semibold">
                Candidate evidence is unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {error instanceof Error
                  ? error.message
                  : "The evidence workspace could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const candidates = [
    ...snapshot.candidates.bullish,
    ...snapshot.candidates.bearish,
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Evidence" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1550px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
                <Gauge aria-hidden="true" className="size-3.5" />
                Deterministic evidence ledger
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Measure setup alignment, not confidence.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Manually evaluate today&apos;s imported candidates against ten
                explicit High-Conviction v1 rules while Schwab market data is
                pending. Every point is traceable to an entered observation.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 self-start md:self-auto">
              {[
                ["Candidates", candidates.length],
                ["Rules", 10],
                ["Version", "v1.0.0"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-24 rounded-xl border border-border bg-card px-3 py-2.5 text-center"
                >
                  <p className="font-mono text-lg font-semibold">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <div className="mb-6 rounded-xl border border-warning/20 bg-warning/[0.055] px-4 py-3 text-xs leading-5 text-[#e9d2a0]">
            Setup Alignment {SETUP_ALIGNMENT_VERSION} is an experimental
            rule-match score. It is not a calibrated probability, investment
            recommendation, expected return, or instruction to buy. Manual
            observations may be stale or mistyped. Only complete assessments
            with a source and timestamp can be saved.
          </div>

          <EvidenceWorkspace
            candidates={candidates}
            initialAssessments={assessments}
          />
        </div>
      </main>
    </div>
  );
}
