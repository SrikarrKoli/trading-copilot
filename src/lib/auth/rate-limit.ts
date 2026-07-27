const FAILURE_LIMIT = 5;
const WINDOW_MILLISECONDS = 15 * 60 * 1000;

type FailureWindow = {
  count: number;
  startedAt: number;
};

const failureWindows = new Map<string, FailureWindow>();

function getActiveWindow(clientKey: string, now: number) {
  const existing = failureWindows.get(clientKey);

  if (!existing || now - existing.startedAt >= WINDOW_MILLISECONDS) {
    failureWindows.delete(clientKey);
    return null;
  }

  return existing;
}

export function canAttemptOwnerLogin(
  clientKey: string,
  now = Date.now(),
) {
  const activeWindow = getActiveWindow(clientKey, now);
  return !activeWindow || activeWindow.count < FAILURE_LIMIT;
}

export function recordOwnerLoginFailure(
  clientKey: string,
  now = Date.now(),
) {
  const activeWindow = getActiveWindow(clientKey, now);

  failureWindows.set(clientKey, {
    count: (activeWindow?.count ?? 0) + 1,
    startedAt: activeWindow?.startedAt ?? now,
  });
}

export function clearOwnerLoginFailures(clientKey: string) {
  failureWindows.delete(clientKey);
}

export const ownerLoginRateLimit = {
  failureLimit: FAILURE_LIMIT,
  windowMilliseconds: WINDOW_MILLISECONDS,
} as const;
