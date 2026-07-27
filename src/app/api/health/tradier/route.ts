import { getOwnerEmail } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";
import { getTradierConfig } from "@/lib/tradier/config";
import { getTradierMarketClock } from "@/lib/tradier/market-data";

export const dynamic = "force-dynamic";

interface TradierHealthDependencies {
  isOwnerAuthenticated: () => Promise<boolean>;
  readClock: typeof getTradierMarketClock;
}

async function isOwnerAuthenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return (
    !error &&
    typeof claims?.sub === "string" &&
    typeof claims.email === "string" &&
    claims.email.toLowerCase() === getOwnerEmail()
  );
}

export function createTradierHealthHandler(
  dependencies: TradierHealthDependencies,
) {
  return async function GET() {
    if (!(await dependencies.isOwnerAuthenticated())) {
      return Response.json(
        { service: "tradier", status: "unauthorized" },
        { status: 401 },
      );
    }

    try {
      const config = getTradierConfig();
      const clock = await dependencies.readClock(config, {
        signal: AbortSignal.timeout(5_000),
      });

      return Response.json({
        environment: config.environment,
        marketDate: clock.date,
        marketState: clock.state,
        service: "tradier",
        status: "connected",
      });
    } catch {
      return Response.json(
        { service: "tradier", status: "unavailable" },
        { status: 503 },
      );
    }
  };
}

export const GET = createTradierHealthHandler({
  isOwnerAuthenticated,
  readClock: getTradierMarketClock,
});
