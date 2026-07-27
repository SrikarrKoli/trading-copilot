import { describe, expect, it, vi } from "vitest";

import { getTradierMarketClock } from "@/lib/tradier/market-data";

const config = {
  accessToken: "private-test-token",
  baseUrl: "https://sandbox.tradier.com/v1",
  environment: "sandbox" as const,
};

describe("getTradierMarketClock", () => {
  it("uses a server-side bearer token and normalizes the market clock", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          clock: {
            date: "2026-07-27",
            description: "Market is closed",
            next_change: "09:30",
            next_state: "open",
            state: "closed",
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      getTradierMarketClock(config, { fetchImplementation }),
    ).resolves.toEqual({
      date: "2026-07-27",
      description: "Market is closed",
      nextChange: "09:30",
      nextState: "open",
      state: "closed",
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://sandbox.tradier.com/v1/markets/clock",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer private-test-token",
        },
      }),
    );
  });

  it("does not include response bodies or credentials in request errors", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response("sensitive upstream response", { status: 401 }),
    );

    await expect(
      getTradierMarketClock(config, { fetchImplementation }),
    ).rejects.toThrow("Tradier request failed with status 401.");
  });
});
