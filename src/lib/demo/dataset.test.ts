import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/owner", () => ({ getPermanentOwnerClaims: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers({ host: "localhost:3000" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(() => { throw new Error("Demo must not query Supabase"); }) }));
import { getPermanentOwnerClaims } from "@/lib/auth/owner";
import { headers } from "next/headers";
import { getDashboardSnapshot } from "@/lib/dashboard/data";
import { getReviewQueueSnapshot } from "@/lib/review/data";
import { getWatchlistSnapshot, getWatchlistOptions } from "@/lib/watchlist/data";
import { getJournalSnapshot, getJournalSourceOptions } from "@/lib/journal/data";
import { getScanSnapshot } from "@/lib/scan/data";
import { getLatestEvidenceAssessmentsForOwner } from "@/lib/evidence/data";
import { calculateSetupAlignment } from "@/lib/evidence/score";
import { recordReviewAction } from "@/app/reviews/actions";
import { createWatchlist, archiveWatchlist, archiveWatchlistItem } from "@/app/watchlists/actions";
import { createManualTrade, appendManualTradeEvent } from "@/app/journal/actions";
import { createScannerDefinition, saveCurrentScan } from "@/app/scans/actions";
import { DEMO_READ_ONLY_MESSAGE, getDemoDashboardSnapshot, getDemoEvidenceInputs, getDemoStrategySource, isDemoDatasetActive } from "@/lib/demo/dataset";

beforeEach(() => {
  vi.stubEnv("TEMP_AUTH_UNLOCK", "true");
  vi.stubEnv("LOCAL_AUTH_BYPASS", "false");
  vi.mocked(getPermanentOwnerClaims).mockResolvedValue(null);
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("unlock demo boundary", () => {
  it("requires an enabled bypass and absent permanent owner claims", async () => {
    expect(await isDemoDatasetActive()).toBe(true);
    vi.stubEnv("TEMP_AUTH_UNLOCK", "false");
    expect(await isDemoDatasetActive()).toBe(false);
    expect(getPermanentOwnerClaims).toHaveBeenCalledTimes(1);
    vi.stubEnv("TEMP_AUTH_UNLOCK", "true");
    vi.mocked(getPermanentOwnerClaims).mockResolvedValue({ sub: "owner" } as Awaited<ReturnType<typeof getPermanentOwnerClaims>>);
    expect(await isDemoDatasetActive()).toBe(false);
  });
  it("honors the host restriction on local bypass", async () => {
    vi.stubEnv("TEMP_AUTH_UNLOCK", "false");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(await isDemoDatasetActive()).toBe(true);
    vi.mocked(headers).mockResolvedValueOnce(new Headers({ host: "example.com" }) as Awaited<ReturnType<typeof headers>>);
    expect(await isDemoDatasetActive()).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(await isDemoDatasetActive()).toBe(false);
  });
  it("populates the dashboard without a session or database query", async () => {
    const snapshot = await getDashboardSnapshot();
    expect(snapshot.candidates.bullish).toHaveLength(10);
    expect(snapshot.candidates.bearish).toHaveLength(8);
    expect(snapshot.imports).toHaveLength(2);
    expect(snapshot.reviewCounts).toEqual({ unreviewed: 8, saved: 3, dismissed: 2, deferred: 2, watchlisted: 3 });
    snapshot.candidates.bullish.pop();
    expect(getDemoDashboardSnapshot().candidates.bullish).toHaveLength(10);
  });
  it("connects reviews, evidence, watchlists, journal and scans", async () => {
    const queue = await getReviewQueueSnapshot();
    const evidence = await getLatestEvidenceAssessmentsForOwner("demo", queue.candidates);
    expect(evidence).toHaveLength(8);
    getDemoEvidenceInputs().forEach((input, i) => {
      const result = calculateSetupAlignment(input);
      expect(result.complete).toBe(true);
      expect(result.score).toBe(evidence[i].score);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(90);
    });
    const lists = await getWatchlistSnapshot();
    expect(await getWatchlistOptions()).toHaveLength(2);
    expect(await getJournalSourceOptions()).toHaveLength(lists.itemCount);
    const journal = await getJournalSnapshot();
    expect(journal.counts.planned).toBe(3);
    expect(journal.trades.every(t => t.latest.realizedPnl === null && t.latest.entryNetValue === null)).toBe(true);
    expect((await getScanSnapshot()).runs[0].results).toHaveLength(10);
    const source = getDemoStrategySource({ kind: "watchlist", watchlistItemId: lists.lists[0].items[0].id });
    expect(source?.symbol).toBe("AAPL");
    expect(source?.evidenceScore).toBe(90);
  });
  it.each([recordReviewAction, createWatchlist, archiveWatchlist, archiveWatchlistItem, createManualTrade, appendManualTradeEvent, createScannerDefinition, saveCurrentScan])("blocks %s before validating or writing", async (action) => {
    const result = await action({ status: "idle", message: "" }, new FormData());
    expect(result).toMatchObject({ status: "error", message: DEMO_READ_ONLY_MESSAGE });
  });
});
