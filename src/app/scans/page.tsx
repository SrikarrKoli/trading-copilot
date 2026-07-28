import { AlertTriangle, ChartNoAxesCombined } from "lucide-react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ScanWorkspace } from "@/components/scan-workspace";
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
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar activeItem="Scans" />
        <main className="min-h-screen lg:pl-64">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-danger"
              />
              <h1 className="mt-4 text-xl font-semibold">
                Saved scans are unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {error instanceof Error
                  ? error.message
                  : "The scan workspace could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const savedSymbols = snapshot.runs.reduce(
    (total, run) => total + run.results.length,
    0,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Scans" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
                <ChartNoAxesCombined aria-hidden="true" className="size-3.5" />
                Versioned scanner evidence
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Preserve what the scanner showed.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Save today&apos;s imported candidates before tomorrow replaces
                them. Definition versions document intended logic without
                claiming this platform executed or validated the Thinkorswim
                scanner.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 self-start md:self-auto">
              {[
                ["Definitions", snapshot.definitions.length],
                ["Snapshots", snapshot.runs.length],
                ["Saved symbols", savedSymbols],
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
            Candidate order preserves workbook order only. It is not a score,
            confidence level, recommendation rank, or validation result.
          </div>

          <ScanWorkspace
            currentSources={snapshot.currentSources}
            definitions={snapshot.definitions}
            runs={snapshot.runs}
          />
        </div>
      </main>
    </div>
  );
}
