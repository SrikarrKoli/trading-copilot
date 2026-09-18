import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "./proxy";

const auth = vi.hoisted(() => ({ email: null as string | null }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string; options: { httpOnly: boolean } }[], headers: Record<string, string>) => void } }) => ({
    auth: { getClaims: async () => {
      options.cookies.setAll([{ name: "session-refresh", value: "refreshed", options: { httpOnly: true } }], {});
      return { data: { claims: { email: auth.email } } };
    } },
  }),
}));

beforeEach(() => {
  auth.email = null;
  vi.stubEnv("AUTH_OWNER_EMAIL", "owner@example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_AUTH_BYPASS", "false");
});
afterEach(() => vi.unstubAllEnvs());

function request(path: string, host = "example.com", acknowledged = false) {
  return new NextRequest(`http://${host}${path}`, { headers: {
    host, ...(acknowledged ? { cookie: "research_acknowledgement=v1" } : {}),
  } });
}

it("makes only the root public, preserving protected workspaces", async () => {
  expect((await updateSession(request("/"))).status).toBe(200);
  for (const path of ["/imports", "/overview", "/onboarding", "/unknown"]) {
    expect((await updateSession(request(path))).headers.get("location")).toBe("http://example.com/login");
  }
});
it("routes owners through onboarding and keeps refreshed cookies on redirects", async () => {
  auth.email = "owner@example.com";
  for (const path of ["/", "/login"]) {
    const response = await updateSession(request(path));
    expect(response.headers.get("location")).toBe("http://example.com/onboarding");
    expect(response.cookies.get("session-refresh")?.value).toBe("refreshed");
    expect((await updateSession(request(path, "example.com", true))).headers.get("location")).toBe("http://example.com/overview");
  }
});
it("uses request host for bypass and ignores forwarded host", async () => {
  vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
  expect((await updateSession(request("/imports", "localhost:3000"))).status).toBe(200);
  const remote = request("/imports");
  remote.headers.set("x-forwarded-host", "localhost");
  expect((await updateSession(remote)).status).toBe(307);
  vi.stubEnv("NODE_ENV", "production");
  expect((await updateSession(request("/imports", "localhost"))).status).toBe(307);
});
