# Trading Copilot

Trading Copilot is a personal AI-assisted trading operating system for an options trader. It shortens the morning research workflow by turning Thinkorswim scanner exports into ranked, explainable opportunities, option-strategy illustrations, journal records, and evidence for improving the process over time.

The workflow is:

```text
Scan -> Import -> Rank -> Explain -> Select strategy
     -> Execute manually in Thinkorswim -> Journal -> Learn
```

The workflow—not an AI stock picker—is the product. Trading Copilot never places a trade, predicts direction as fact, or replaces the trader's judgment.

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
- atomically deletes and replaces only the uploaded direction; and
- returns the existing active batch when the same owner uploads the same
  direction and file again.

The authenticated workspace also provides a Supabase-backed Overview, a
review queue with append-only decisions, and named watchlists. Overview shows
evidence coverage and places assessed current candidates in deterministic Setup
Alignment order while leaving missing scores explicit. A new daily import
replaces stale scanner candidates, while deliberately watchlisted symbols
remain until they are archived. Every watchlist assignment retains the source
import, direction, and workbook row behind the decision.

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

Reviews also shows whether each current candidate has no sourced strategy, a
saved strategy awaiting journal planning, or an existing linked Journal
record. Its primary action advances to the next available step. These progress
signals are derived only from exact current-import provenance, so an older
replaced candidate cannot reappear in the daily queue.

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
without breaking that provenance chain, and the save confirmation exposes that
Journal handoff immediately. These workflows are never sent to a broker or
presented as a recommendation. Live quotes, expected move, Greeks, IV,
probability, assignment behavior, and broker margin remain explicitly
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
- [Tradier market data](docs/TRADIER.md)
- [Roadmap](docs/ROADMAP.md)
- [Decision log](docs/DECISIONS.md)

## Status

Requirements baseline: `v1.0`, July 26, 2026. Open implementation decisions are recorded in [DECISIONS.md](docs/DECISIONS.md).
