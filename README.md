# Setup Lens

Setup Lens is an evidence-first market-scanning workspace for an options trader. It shortens the morning research workflow by turning Thinkorswim scanner exports into ranked, inspectable setups, option-strategy illustrations, journal records, and evidence for improving the process over time.

The workflow is:

```text
Scan -> Import -> Rank -> Explain -> Select strategy
     -> Execute manually in Thinkorswim -> Journal -> Learn
```

The workflow—not a stock picker—is the product. Setup Lens never places a trade, predicts direction as fact, or replaces the trader's judgment.

## Interface system

The application uses one shared, scanner-first interface system across every
authenticated route:

- four primary workspaces with subordinate scanner tools and fixed mobile
  navigation;
- an editorial page hierarchy with dense metric strips instead of repeated
  dashboard cards;
- restrained bullish, bearish, warning, and provenance color roles;
- controlled transitions with `prefers-reduced-motion` support; and
- consistent loading, empty, error, form, table, and account-recovery states.

Scanner is the visual reference workspace. Supporting routes reuse its tokens
and interaction rules without changing the underlying data, scoring, or
provenance behavior.

## Product promise

The product should help answer five questions:

1. What deserves my attention?
2. What observable evidence supports or weakens the setup?
3. What would the risk and payoff of each option structure be?
4. How have comparable, historically defined setups performed?
5. What patterns exist in my own decisions and outcomes?

## Non-negotiable principles

- Use deterministic code whenever a defined calculation exists.
- AI explains evidence; it does not invent signals or predict outcomes.
- Every score and analysis must expose its inputs, formula or prompt version, timestamp, and data provenance.
- A score is not a probability unless it has been calibrated and validated as one.
- Backtests must be point-in-time, reproducible, and explicit about costs and bias.
- The product never submits, stages, or approves an order.

## Product language

Use **opportunity**, **setup**, **analysis**, **evidence**, and **strategy illustration**. Avoid **recommendation**, **pick**, **signal to buy**, and **AI confidence**. A deterministic ranking may say "ranked first under score version X"; it may not say "best trade."

## Current phase

The first implementation milestone is a deterministic, manually uploaded Excel-workbook workflow that replaces copying and spreadsheet maintenance while preserving raw inputs and reproducible scores. Thinkorswim remains the scanner and execution platform.

The current vertical slice provides a local browser preview and an explicitly
approved, authenticated database import that:

- accepts `.xlsx` scanner exports up to 10 MB;
- reads only column A without executing formulas or external content;
- detects the canonical `Watchlist Scanner` / `Results` / `Symbol` preamble;
- preserves source row numbers and raw values;
- normalizes identifiers and reports blanks, duplicates, and invalid rows; and
- hashes the original workbook bytes with SHA-256 on the server;
- saves physical rows, reconciled counts, and audit events atomically; and
- keeps bullish and bearish rows in separate current-state tables;
- scopes active scanner data to the server-derived America/Chicago date;
- on the first successful import of a new date, retires both prior-day current
  lists, then replaces only the uploaded direction during later same-day
  imports; and
- returns the existing active batch when the same owner uploads the same
  direction and file again on that date.

The authenticated workspace also provides a Supabase-backed Overview, a
review queue with append-only decisions, and named watchlists. Overview shows
evidence coverage and places assessed current candidates in deterministic Setup
Alignment order while leaving missing scores explicit. A new daily import
replaces stale scanner candidates, while deliberately watchlisted symbols
remain until they are archived. Journal entries and explicitly saved scan
snapshots also remain. Every watchlist assignment retains the source import,
direction, and workbook row behind the decision.

The manual trade journal works without broker connectivity. It can begin from
an active watchlist symbol or a manually entered ticker and records plans,
required counter-evidence, status changes, financial values, mistakes, lessons,
and tags as append-only snapshots. P/L remains explicitly user-entered until a
future broker reconciliation source is available.

The Scans workspace can version a descriptive scanner definition and preserve
the current imported candidate list before a later daily upload replaces it.
Definitions remain `experimental` until the exact Thinkorswim criteria are
captured and tested. Saved runs are labeled `import_snapshot`: they prove which
symbols were imported under a named definition version, not that Trading
Copilot executed or validated the scanner. Workbook order is retained only as
candidate order and is never presented as a score or recommendation rank.

The Evidence workspace provides experimental manual Setup Alignment while live
market data is unavailable. It scores ten explicit High-Conviction v1 rules at
ten points each, shows every entered observation and pass/fail/missing result,
and publishes a comparison score only when all ten components are present.
Complete assessments with an observation source and timestamp can be saved as
append-only Supabase snapshots. The Evidence chart and Reviews queue show the
latest saved snapshot for each current candidate while older snapshots remain
auditable. This is rule matching—not confidence, expected return, investment
suitability, or a recommendation.

Overview is the scanner-ranking surface. Complete current observations appear
as separate bullish and bearish 0–100 Setup Alignment bars; symbols without all
required evidence remain in an unranked “Awaiting market data” group. Workbook
position is never displayed as analysis rank, and no placeholder score is
invented while Schwab connectivity is pending.

Schwab Trader API is the only planned live market-data adapter. A
provider-independent scanner-observation contract already maps its future
price, market-cap, trend, momentum, volatility, strength, volume, and 20-day
range inputs into the deterministic evidence engine. The application contains
no Schwab credentials or endpoint assumptions yet, and all former
Tradier-specific scaffolding has been removed.

The broker-independent Strategy Lab accepts manual option quotes for long calls,
long puts, bull call debit spreads, and bear put debit spreads. Engine `1.0.0`
calculates selected midpoint/natural/manual fills, net debit, estimated entry
capital, fee-adjusted maximum gain/loss, expiration break-even, scenarios, and a
payoff chart. Up to four illustrations for the same symbol, spot price, and
expiration can be compared on a shared payoff axis with their quote times and
key risk metrics visible. The comparison exposes tradeoffs without ranking the
structures. An individual calculation can be explicitly saved as an immutable
Supabase snapshot of its raw assumptions. Saved snapshots are recalculated by
the versioned engine on load. Current candidates can open Strategy Lab directly
from Reviews or an active Watchlist item, which prefills the symbol and
direction while retaining the exact import row and optional saved Setup
Alignment assessment. A saved illustration can then prefill a journal plan
without breaking that provenance chain. These workflows are never sent to a
broker or presented as a recommendation. Live quotes, expected move, Greeks,
IV, probability, assignment behavior, and broker margin remain explicitly
unavailable.

The original workbook file itself is not retained. The database stores its
filename, byte size, SHA-256 identity, safe counts, and audit events. Historical
ticker rows are not retained: only the current bullish and bearish physical
rows and normalized validation results remain unless the owner explicitly saves
an immutable scan snapshot. Multi-sheet approval remains disabled until
worksheet selection is implemented.

## Local development

Requirements: Node.js 24 LTS and npm 11 or newer.

```powershell
npm install
npm run dev
```

Quality checks:

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

## Documentation map

- [Project context](docs/PROJECT_CONTEXT.md)
- [Input files](docs/INPUT_FILES.md)
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Scanners](docs/SCANNERS.md)
- [Option strategies](docs/OPTION_STRATEGIES.md)
- [Conviction engine](docs/CONVICTION_ENGINE.md)
- [Backtesting](docs/BACKTESTING.md)
- [AI guidelines](docs/AI_GUIDELINES.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Schwab market data](docs/SCHWAB.md)
- [Roadmap](docs/ROADMAP.md)
- [Decision log](docs/DECISIONS.md)

## Status

Requirements baseline: `v1.0`, July 26, 2026. Open implementation decisions are recorded in [DECISIONS.md](docs/DECISIONS.md).
