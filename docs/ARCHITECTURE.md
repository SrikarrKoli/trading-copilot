# Architecture

## Architectural stance

Start as a modular monolith. The product is too early for microservices. Keep deterministic domain logic independent of Next.js, Supabase, OpenAI, and any market-data vendor so it can be tested and moved to workers later.

## Proposed stack

| Concern | Choice | Rationale |
|---|---|---|
| Web app | Next.js + React + TypeScript | One deployable product and strong typed UI/server integration |
| UI | Tailwind CSS + shadcn/ui | Fast, accessible component foundation; custom design remains required |
| API | Next.js Route Handlers | Explicit HTTP boundaries for imports and long-lived compatibility |
| Database/Auth | Supabase Postgres + Auth | Relational integrity, SQL analytics, and row-level security |
| Charts | TradingView Lightweight Charts | Client-side financial charts; required attribution must remain |
| AI | OpenAI API, server-side only | Structured explanations with versioned prompts and schemas |
| Deployment | Vercel | Natural Next.js deployment path |
| Source control | GitHub | Reviewable changes and CI |

Do not freeze “Next.js 15” in the architecture. At implementation, pin the current supported LTS and record it in the decision log. As of July 2026, Next.js 16.x is Active LTS while 15.x is Maintenance LTS, so a new project should not default to 15 without a compatibility reason.

## Logical modules

```text
UI
 ├─ Import review
 ├─ Scan dashboard
 ├─ Ticker analysis
 ├─ Strategy lab
 └─ Journal/backtests
       │
Application services
 ├─ Import orchestration
 ├─ Scan execution
 ├─ Review workflow
 ├─ Backtest orchestration
 └─ AI explanation boundary
       │
Domain core (pure TypeScript)
 ├─ Normalization and validation
 ├─ Indicators and scanner rules
 ├─ Score calculations
 ├─ Option payoff calculations
 └─ Performance statistics
       │
Infrastructure
 ├─ Supabase/Postgres
 ├─ Object storage
 ├─ Background jobs
 ├─ Market-data adapters
 └─ OpenAI adapter
```

## Data flow

1. Preview the selected `.xlsx` locally without database writes.
2. Read displayed values from column A of the selected worksheet into a staging representation.
3. Validate header handling and stock identifiers; identify blanks and duplicates.
4. Show a preview and error report.
5. After explicit approval, revalidate and hash the original bytes on the
   server, then commit normalized rows and immutable import metadata in one
   PostgreSQL transaction.
6. Run a versioned scanner and score definition.
7. Persist outputs rather than recalculating history with current rules.
8. Present results to the user for save/dismiss/defer actions.

The end-to-end product loop is:

```text
Thinkorswim scanners -> manual Excel workbook import -> database -> indicator engine
-> conviction engine -> option engine -> AI explanation
-> dashboard -> manual Thinkorswim execution -> trade journal
-> backtesting and learning
```

AI is not on the critical calculation path. Ranking and strategy mechanics remain available when the AI provider is unavailable.

## Long-running work

Workbook normalization may remain synchronous for small files. Backtests, bulk feature computation, and later market-data ingestion belong in background jobs with:

- idempotency keys;
- progress and terminal status;
- retry limits;
- cancellation;
- versioned inputs; and
- immutable result manifests.

Do not assume Vercel request duration is suitable for full backtests.

## Security

- Enable RLS on every exposed table and pair it with explicit grants.
- Enforce `user_id = auth.uid()` ownership policies.
- Keep service-role credentials server-only.
- Derive import ownership from the verified Supabase JWT; never accept an
  `owner_id` supplied by the browser.
- Route privileged import and audit writes through the JWT-verifying Supabase
  Edge Function and the service-only, `SECURITY INVOKER` transaction.
- Validate file type by content and size, not extension alone.
- Treat workbook cells, formulas, links, macros, and embedded objects as untrusted input. Import only the displayed column-A value and never execute active content.
- Never log access tokens, raw journal text, full workbook rows, or AI payloads.
- Store secrets in managed environment variables.
- Keep the Tradier token server-only and expose only allowlisted read-only
  `/markets` operations through the Tradier adapter. Do not implement account,
  order, or trade methods.
- Add rate limits to uploads and AI endpoints.
- Local development may bypass interactive authentication only when
  `LOCAL_AUTH_BYPASS=true`, `NODE_ENV=development`, and the request hostname is
  a loopback address. Production builds and non-loopback hosts must ignore the
  flag and require Supabase authentication.

## AI boundary

The AI adapter receives a compact, allow-listed JSON evidence packet. It returns schema-validated JSON. The server independently verifies ticker, timestamps, numeric claims, cited fact IDs, prohibited language, and prompt/model versions before display. If validation fails, show deterministic evidence without AI prose.

## Testing

- Unit tests: parsers, indicators, scores, option payoffs, statistics.
- Contract tests: workbook schemas, market-data adapters, AI schemas.
- Integration tests: Postgres constraints and RLS.
- End-to-end tests: import → scan → review → saved result.
- Golden fixtures: known indicator, payoff, and backtest results.

## Observability and reproducibility

Every derived artifact carries `definition_version`, `code_version`, `data_as_of`, `created_at`, and source identifiers. Logs use correlation IDs. Historical outputs are append-only except for user-authored annotations.

## Vendor constraints

- TradingView Lightweight Charts is client-side and requires TradingView attribution.
- Market-data entitlements, retention, and redistribution rights must be reviewed before Polygon or another feed is enabled.
- Supabase Data API exposure requires both grants and RLS; neither replaces the other.

## Current vendor references

- [Next.js release and support policy](https://nextjs.org/support-policy)
- [TradingView Lightweight Charts documentation](https://tradingview.github.io/lightweight-charts/docs)
- [Supabase Row Level Security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API security documentation](https://supabase.com/docs/guides/api/securing-your-api)
- [Tradier API documentation](https://docs.tradier.com/)

These references are operational dependencies, not permanent facts. Recheck versions, support status, terms, and security guidance during implementation.
