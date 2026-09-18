import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthCallbackUrl, getSiteOrigin } from "./site-url";

afterEach(() => vi.unstubAllEnvs());

describe("configured auth URLs", () => {
  it.each([
    ["https://trading-copilot-ten.vercel.app/", "https://trading-copilot-ten.vercel.app"],
    ["http://localhost:3000/path?query=1", "http://localhost:3000"],
  ])("extracts the origin from %s", (configured, origin) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured);
    expect(getSiteOrigin()).toBe(origin);
  });

  it.each([undefined, "", " "])("rejects missing configuration: %s", (value) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(getSiteOrigin).toThrow("not configured");
  });

  it.each(["garbled", "/relative", "javascript:alert(1)", "ftp://example.com", "https://user:password@example.com"])("rejects invalid site URL %s", (value) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(getSiteOrigin).toThrow("valid HTTP(S) URL");
  });

  it("builds callbacks with only the optional password recovery path", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trading-copilot-ten.vercel.app");
    expect(getAuthCallbackUrl()).toBe("https://trading-copilot-ten.vercel.app/auth/callback");
    expect(getAuthCallbackUrl("/update-password")).toBe("https://trading-copilot-ten.vercel.app/auth/callback?next=/update-password");
  });

  it.each(["https://evil.example", "//evil.example", "/unknown", "/update-password?next=//evil.example", ""])("rejects unsupported next %s", (next) => {
    expect(() => getAuthCallbackUrl(next)).toThrow("Unsupported");
  });
});
