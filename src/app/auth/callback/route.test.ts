import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  exchangeError: null as { message: string } | null,
  claimsEmail: "owner@example.com" as string | null,
  userEmail: null as string | null,
  signedOut: false,
  setCookies: true,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: { httpOnly: boolean } }[],
          headers: Record<string, string>,
        ) => void;
      };
    },
  ) => ({
    auth: {
      exchangeCodeForSession: async () => {
        if (auth.setCookies) {
          options.cookies.setAll(
            [{ name: "sb-access-token", value: "session", options: { httpOnly: true } }],
            {},
          );
        }
        return { error: auth.exchangeError };
      },
      getClaims: async () => ({
        data: auth.claimsEmail ? { claims: { email: auth.claimsEmail } } : { claims: {} },
      }),
      getUser: async () => ({
        data: { user: auth.userEmail ? { email: auth.userEmail } : null },
      }),
      signOut: async () => {
        auth.signedOut = true;
      },
    },
  }),
}));

describe("auth callback route", () => {
  beforeEach(() => {
    auth.exchangeError = null;
    auth.claimsEmail = "owner@example.com";
    auth.userEmail = null;
    auth.signedOut = false;
    auth.setCookies = true;
    vi.stubEnv("AUTH_OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trading-copilot-ten.vercel.app");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function request(path: string) {
    return new NextRequest(`https://trading-copilot-ten.vercel.app${path}`);
  }

  it("rejects missing code", async () => {
    const { GET } = await import("./route");
    const response = await GET(request("/auth/callback?next=/update-password"));
    expect(response.headers.get("location")).toBe(
      "https://trading-copilot-ten.vercel.app/login?error=invalid-link",
    );
  });

  it("attaches session cookies and honors update-password next", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request("/auth/callback?code=abc&next=%2Fupdate-password"),
    );
    expect(response.headers.get("location")).toBe(
      "https://trading-copilot-ten.vercel.app/update-password",
    );
    expect(response.cookies.get("sb-access-token")?.value).toBe("session");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("falls back to onboarding for disallowed next", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request("/auth/callback?code=abc&next=https://evil.example"),
    );
    expect(response.headers.get("location")).toBe(
      "https://trading-copilot-ten.vercel.app/onboarding",
    );
  });

  it("signs out non-owner sessions", async () => {
    auth.claimsEmail = "intruder@example.com";
    const { GET } = await import("./route");
    const response = await GET(
      request("/auth/callback?code=abc&next=/update-password"),
    );
    expect(auth.signedOut).toBe(true);
    expect(response.headers.get("location")).toBe(
      "https://trading-copilot-ten.vercel.app/login?error=invalid-link",
    );
  });

  it("uses getUser email when claims omit email", async () => {
    auth.claimsEmail = null;
    auth.userEmail = "owner@example.com";
    const { GET } = await import("./route");
    const response = await GET(
      request("/auth/callback?code=abc&next=/update-password"),
    );
    expect(response.headers.get("location")).toBe(
      "https://trading-copilot-ten.vercel.app/update-password",
    );
  });

  it("rejects exchange failures", async () => {
    auth.exchangeError = { message: "bad code" };
    const { GET } = await import("./route");
    const response = await GET(request("/auth/callback?code=bad"));
    expect(response.headers.get("location")).toBe(
      "https://trading-copilot-ten.vercel.app/login?error=invalid-link",
    );
  });
});
