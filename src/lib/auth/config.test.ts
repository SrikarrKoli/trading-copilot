import { afterEach, describe, expect, it, vi } from "vitest";
import { hostnameFromHost, isLocalAuthBypassEnabled } from "./config";
import { ownerStartPath } from "./onboarding";

afterEach(() => vi.unstubAllEnvs());

describe("local auth bypass", () => {
  it("ignores the flag in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled("localhost")).toBe(false);
  });
  it.each(["example.com", "localhost.example.com", "192.168.1.1", "127.0.0.2", "https://localhost", "localhost@evil.com", "localhost,evil.com"])("denies non-loopback host %s", (host) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled(host)).toBe(false);
  });
  it.each(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"])("allows flagged development on %s", (host) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled(host)).toBe(true);
  });
  it("denies missing host and requires the exact flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled()).toBe(false);
    expect(isLocalAuthBypassEnabled(null)).toBe(false);
    vi.stubEnv("LOCAL_AUTH_BYPASS", "false");
    expect(isLocalAuthBypassEnabled("localhost")).toBe(false);
  });
  it("extracts loopback authorities with ports without accepting URLs or userinfo", () => {
    expect(hostnameFromHost("localhost:3000")).toBe("localhost");
    expect(hostnameFromHost("[::1]:3000")).toBe("[::1]");
    expect(hostnameFromHost("localhost@evil.com")).toBeUndefined();
    expect(hostnameFromHost("localhost:3000/evil")).toBeUndefined();
    expect(hostnameFromHost(null)).toBeUndefined();
  });
});

it("routes only the current acknowledgement to overview", () => {
  expect(ownerStartPath()).toBe("/onboarding");
  expect(ownerStartPath("old")).toBe("/onboarding");
  expect(ownerStartPath("v1")).toBe("/overview");
});
