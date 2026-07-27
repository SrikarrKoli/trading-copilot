import { afterEach, describe, expect, it, vi } from "vitest";

import { createTradierHealthHandler } from "@/app/api/health/tradier/route";

const originalEnvironment = process.env.TRADIER_ENVIRONMENT;
const originalToken = process.env.TRADIER_ACCESS_TOKEN;

afterEach(() => {
  if (originalEnvironment === undefined) {
    delete process.env.TRADIER_ENVIRONMENT;
  } else {
    process.env.TRADIER_ENVIRONMENT = originalEnvironment;
  }
  if (originalToken === undefined) {
    delete process.env.TRADIER_ACCESS_TOKEN;
  } else {
    process.env.TRADIER_ACCESS_TOKEN = originalToken;
  }
});

describe("GET /api/health/tradier", () => {
  it("denies an unauthenticated request before using Tradier", async () => {
    const readClock = vi.fn();
    const handler = createTradierHealthHandler({
      isOwnerAuthenticated: vi.fn().mockResolvedValue(false),
      readClock,
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      service: "tradier",
      status: "unauthorized",
    });
    expect(readClock).not.toHaveBeenCalled();
  });

  it("returns a sanitized connectivity result", async () => {
    process.env.TRADIER_ENVIRONMENT = "sandbox";
    process.env.TRADIER_ACCESS_TOKEN = "test-token";
    const handler = createTradierHealthHandler({
      isOwnerAuthenticated: vi.fn().mockResolvedValue(true),
      readClock: vi.fn().mockResolvedValue({
        date: "2026-07-27",
        description: "Market is closed",
        nextChange: "09:30",
        nextState: "open",
        state: "closed",
      }),
    });

    const response = await handler();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      environment: "sandbox",
      marketDate: "2026-07-27",
      marketState: "closed",
      service: "tradier",
      status: "connected",
    });
  });
});
