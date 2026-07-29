import { FileUp, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ImportWorkspace } from "@/components/import-workspace";
import { WorkspaceHeader, WorkspaceNotice } from "@/components/workspace-chrome";
import { hasOwnerAccess } from "@/lib/auth/owner";

export default async function HomePage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  return (
    <AppShell activeItem="Imports">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            actions={
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.055] px-3 py-2 text-[10px] font-medium text-accent">
                <LockKeyhole aria-hidden="true" className="size-3.5" />
                Private inspection
              </span>
            }
            description="Inspect the workbook, verify every identifier, and decide what enters today's review queue. Nothing is saved until you approve the parsed result."
            eyebrow="Scanner intake"
            icon={FileUp}
            title="Bring today’s scanner into focus."
          />
          <div className="mt-5">
            <WorkspaceNotice icon={LockKeyhole}>
              Files are parsed locally for preview, then revalidated by the
              server before the approved batch is committed. The first
              successful import on a new Chicago date retires yesterday&apos;s
              active scanner rows; saved watchlists, journal entries, and scan
              snapshots remain.
            </WorkspaceNotice>
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <ImportWorkspace />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
