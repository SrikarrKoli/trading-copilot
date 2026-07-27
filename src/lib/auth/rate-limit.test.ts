import { beforeEach, describe, expect, it } from "vitest";

import {
  canAttemptOwnerLogin,
  clearOwnerLoginFailures,
  ownerLoginRateLimit,
  recordOwnerLoginFailure,
} from "@/lib/auth/rate-limit";

const clientKey = "test-client";

describe("owner login rate limit", () => {
  beforeEach(() => {
    clearOwnerLoginFailures(clientKey);
  });

  it("blocks a client after repeated failed attempts", () => {
    for (let attempt = 0; attempt < ownerLoginRateLimit.failureLimit; attempt++) {
      expect(canAttemptOwnerLogin(clientKey, 1_000)).toBe(true);
      recordOwnerLoginFailure(clientKey, 1_000);
    }

    expect(canAttemptOwnerLogin(clientKey, 1_000)).toBe(false);
  });

  it("allows attempts after the failure window expires", () => {
    for (let attempt = 0; attempt < ownerLoginRateLimit.failureLimit; attempt++) {
      recordOwnerLoginFailure(clientKey, 1_000);
    }

    expect(
      canAttemptOwnerLogin(
        clientKey,
        1_000 + ownerLoginRateLimit.windowMilliseconds,
      ),
    ).toBe(true);
  });

  it("clears failures after a successful login", () => {
    recordOwnerLoginFailure(clientKey, 1_000);
    clearOwnerLoginFailures(clientKey);

    expect(canAttemptOwnerLogin(clientKey, 1_000)).toBe(true);
  });
});
