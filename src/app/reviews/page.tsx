import { ClipboardCheck, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ReviewQueue } from "@/components/review-queue";
import {
  MetricStrip,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceNotice,
} from "@/components/workspace-chrome";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { getReviewQueueSnapshot } from "@/lib/review/data";
import { getWatchlistOptions } from "@/lib/watchlist/data";

export default async function ReviewsPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  let snapshot;
  try {
    const [reviewSnapshot, watchlists] = await Promise.all([
      getReviewQueueSnapshot(),
      getWatchlistOptions(),
    ]);
    snapshot = { ...reviewSnapshot, watchlists };
  } catch (error) {
    return (
      <AppShell activeItem="Reviews">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
          <WorkspaceError
            message={
              error instanceof Error
                ? error.message
                : "The current candidates could not be loaded."
            }
            title="Review queue is unavailable"
          />
        </div>
      </AppShell>
    );
  }

  const openCount = snapshot.candidates.filter(
    ({ latestAction }) => !latestAction,
  ).length;

  return (
    <AppShell activeItem="Reviews">
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <WorkspaceHeader
            description="Save, dismiss, defer, or move a candidate into focused research. Every choice keeps its scanner provenance and rationale."
            eyebrow="Decision queue"
            icon={ClipboardCheck}
            title="Review each candidate deliberately."
          />
          <div className="mt-5">
            <MetricStrip
              metrics={[
                {
                  detail: "Awaiting a decision",
                  label: "Open",
                  tone: "warning",
                  value: openCount,
                },
                {
                  detail: "Current scanner candidates",
                  label: "Bullish",
                  tone: "accent",
                  value: snapshot.counts.bullish,
                },
                {
                  detail: "Current scanner candidates",
                  label: "Bearish",
                  tone: "danger",
                  value: snapshot.counts.bearish,
                },
              ]}
            />
          </div>
          <div className="mt-4">
            <WorkspaceNotice icon={Info} tone="info">
              Setup Alignment appears only after a complete assessment and
              measures rule matching, not confidence.{" "}
              <Link href="/evidence" className="font-medium underline">
                Assess evidence
              </Link>
              {" · "}
              <Link href="/watchlists" className="font-medium underline">
                Manage watchlists
              </Link>
            </WorkspaceNotice>
          </div>
          <div className="ui-enter ui-enter-delay-2 mt-6">
            <ReviewQueue
              candidates={snapshot.candidates}
              watchlists={snapshot.watchlists}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
