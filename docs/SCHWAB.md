# Schwab Market-Data Integration

## Product boundary

Schwab Trader API is the planned read-only source for enriching the current
Thinkorswim scanner symbols. Setup Lens will not expose account, order, or
trade methods. Thinkorswim remains the manual scanner and execution platform.

No Schwab endpoint is called until the approved application credentials and
current official response contracts are available. The application does not
substitute fixture values, workbook order, or stale manual evidence for live
market data.

## Server-only security boundary

Schwab application credentials, access tokens, and refresh tokens must remain
server-only. They must never:

- use a `NEXT_PUBLIC_` environment-variable prefix;
- be returned by a health or analysis route;
- appear in browser code, application logs, documentation, Git history, or
  issue trackers; or
- be stored in an owner-readable Supabase table.

The exact environment-variable and token-storage contract will be recorded
after the approved Schwab application supplies its credential and OAuth
requirements. Do not guess that contract in advance.

## Normalized scanner observation

The adapter must normalize sourced Schwab data into the provider-independent
`ScannerMarketObservation` contract before the score engine sees it. One
complete observation contains:

- symbol, source, and observation timestamp;
- price and market capitalization;
- 20 EMA and 50 EMA;
- MACD direction;
- RSI;
- ATR as a percentage of price;
- ADX;
- average volume; and
- 20-trading-day high and low.

The direction-specific evidence mapper selects the high for bullish candidates
and the low for bearish candidates. Setup Alignment remains deterministic rule
matching, not confidence, probability, expected return, or a recommendation.

## Planned read flow

1. Read only the current deduplicated bullish and bearish scanner symbols.
2. Request the minimum allow-listed Schwab market data needed for those symbols.
3. Normalize and validate every response before calculation.
4. Calculate versioned indicators and Setup Alignment on the server.
5. Persist point-in-time source, timestamp, raw observations, calculation
   version, and component results through an owner-scoped boundary.
6. Rank only candidates with a complete, fresh observation.
7. Show missing, stale, rate-limited, or unsupported symbols separately rather
   than assigning them a score.

Requests must be batched within the provider's current documented limits.
Retries must be bounded and must not turn an upstream failure into a successful
analysis state.

## Before live implementation

Confirm all of the following against the approved application and current
official Schwab documentation:

- OAuth authorization, refresh, revocation, and callback behavior;
- available quote, instrument/fundamental, and price-history fields;
- timestamp and session semantics;
- rate limits and batching constraints;
- market-data entitlements, retention, and derived-data rights; and
- the exact Thinkorswim timeframe and indicator parameters the ranking must
  reproduce.

Official portal: <https://developer.schwab.com/products/trader-api--individual>
