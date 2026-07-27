# Tradier Market-Data Integration

## Boundary

Trading Copilot uses Tradier as a read-only market-data provider. The adapter
does not expose account, order, or trade methods. Thinkorswim remains the manual
execution platform.

The Tradier access token is a server-only environment variable. It must never
use a `NEXT_PUBLIC_` prefix, appear in browser code, be committed to Git, or be
written to application logs.

## Environments

| Environment | Base URL | Data |
|---|---|---|
| Sandbox | `https://sandbox.tradier.com/v1` | Delayed equities and options; no Greeks |
| Production | `https://api.tradier.com/v1` | Real-time equities/options for Tradier Brokerage account holders; options Greeks are updated hourly |

Trading Copilot defaults to production because delayed data is not acceptable
for the evaluation workflow. Sandbox remains supported only for isolated
adapter testing.

```dotenv
TRADIER_ENVIRONMENT=production
TRADIER_ACCESS_TOKEN=replace_with_your_production_token
```

Generate the production personal token in Tradier API settings. Real-time
equity and options data requires a Tradier Brokerage account. Do not paste the
token into documentation, source code, issue trackers, or chat.

## Initial connectivity check

The owner-authenticated `GET /api/health/tradier` route calls only
`GET /markets/clock`. It returns a sanitized environment, market date, market
state, and connection status. It never returns the token or upstream response
body.

## Planned read-only endpoints

1. Batch quotes for the current bullish and bearish symbols.
2. Historical daily prices.
3. Option expirations.
4. Option chains with quotes, IV, and Greeks where the selected environment
   provides them.
5. Time and sales only when intraday calculations require it.

Rate-limit headers must be observed and requests should be batched. Tradier
documents market-data limits of 120 requests per minute in production and
60 requests per minute in sandbox.

## Official references

- [Authentication](https://docs.tradier.com/docs/authentication)
- [Environment endpoints](https://docs.tradier.com/docs/endpoints)
- [Market data](https://docs.tradier.com/docs/market-data)
- [Rate limiting](https://docs.tradier.com/docs/rate-limiting)
- [Market clock](https://docs.tradier.com/reference/brokerage-api-markets-get-clock)
- [Quotes](https://docs.tradier.com/reference/brokerage-api-markets-get-quotes)
- [Option expirations](https://docs.tradier.com/reference/brokerage-api-markets-get-options-expirations)
- [Option chains](https://docs.tradier.com/reference/brokerage-api-markets-get-options-chains)
