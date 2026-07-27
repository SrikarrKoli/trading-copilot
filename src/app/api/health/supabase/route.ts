import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const { publishableKey, url } = getSupabasePublicEnv();

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return Response.json(
        { service: "supabase", status: "unavailable" },
        { status: 503 },
      );
    }

    return Response.json({
      projectRef: new URL(url).hostname.split(".")[0],
      service: "supabase",
      status: "connected",
    });
  } catch {
    return Response.json(
      { service: "supabase", status: "unavailable" },
      { status: 503 },
    );
  }
}
