import { afterEach, describe, expect, it } from "vitest";

import { getTradierConfig } from "@/lib/tradier/config";

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

describe("getTradierConfig", () => {
  it("defaults to the live production market-data endpoint", () => {
    delete process.env.TRADIER_ENVIRONMENT;
    process.env.TRADIER_ACCESS_TOKEN = "test-token";

    expect(getTradierConfig()).toEqual({
      accessToken: "test-token",
      baseUrl: "https://api.tradier.com/v1",
      environment: "production",
    });
  });

  it("selects the production market-data endpoint explicitly", () => {
    process.env.TRADIER_ENVIRONMENT = "production";
    process.env.TRADIER_ACCESS_TOKEN = "production-token";

    expect(getTradierConfig()).toEqual({
      accessToken: "production-token",
      baseUrl: "https://api.tradier.com/v1",
      environment: "production",
    });
  });

  it("rejects missing credentials", () => {
    delete process.env.TRADIER_ACCESS_TOKEN;

    expect(() => getTradierConfig()).toThrow(
      "TRADIER_ACCESS_TOKEN is not configured.",
    );
  });
});
