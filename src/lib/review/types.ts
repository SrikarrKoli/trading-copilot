import type {
  DashboardCandidate,
  DashboardDirection,
} from "@/lib/dashboard/data";
import type { SavedEvidenceAssessment } from "@/lib/evidence/data";

export const REVIEW_ACTIONS = [
  "saved",
  "dismissed",
  "deferred",
  "watchlisted",
] as const;

export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export const REVIEW_REASONS = [
  { value: "strong_setup", label: "Strong setup evidence" },
  { value: "needs_research", label: "Needs more research" },
  { value: "review_later", label: "Review later" },
  { value: "event_risk", label: "Event risk" },
  { value: "insufficient_data", label: "Insufficient data" },
  { value: "duplicate_exposure", label: "Duplicate exposure" },
  { value: "outside_plan", label: "Outside trading plan" },
  { value: "other", label: "Other" },
] as const;

export type ReviewReason = (typeof REVIEW_REASONS)[number]["value"];

export interface LatestReviewAction {
  action: ReviewAction;
  createdAt: string;
  id: string;
  note: string | null;
  reasonCode: ReviewReason;
}

export interface ReviewQueueCandidate extends DashboardCandidate {
  latestAction: LatestReviewAction | null;
  latestEvidence: SavedEvidenceAssessment | null;
}

export interface ReviewQueueSnapshot {
  candidates: ReviewQueueCandidate[];
  counts: Record<DashboardDirection | "all", number>;
}

export interface ReviewActionState {
  message: string;
  status: "idle" | "error" | "success";
}

export const INITIAL_REVIEW_ACTION_STATE: ReviewActionState = {
  message: "",
  status: "idle",
};
