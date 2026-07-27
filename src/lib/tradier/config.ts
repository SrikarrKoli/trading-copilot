export type TradierEnvironment = "production" | "sandbox";

export interface TradierConfig {
  accessToken: string;
  baseUrl: string;
  environment: TradierEnvironment;
}

const TRADIER_BASE_URLS: Record<TradierEnvironment, string> = {
  production: "https://api.tradier.com/v1",
  sandbox: "https://sandbox.tradier.com/v1",
};

export function getTradierConfig(): TradierConfig {
  const environmentValue =
    process.env.TRADIER_ENVIRONMENT?.trim().toLowerCase() || "production";

  if (
    environmentValue !== "production" &&
    environmentValue !== "sandbox"
  ) {
    throw new Error(
      "TRADIER_ENVIRONMENT must be either sandbox or production.",
    );
  }

  const accessToken = process.env.TRADIER_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("TRADIER_ACCESS_TOKEN is not configured.");
  }

  return {
    accessToken,
    baseUrl: TRADIER_BASE_URLS[environmentValue],
    environment: environmentValue,
  };
}
