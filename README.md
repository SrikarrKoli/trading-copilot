# Trading Copilot

Trading Copilot is a personal AI-assisted trading operating system for one options trader. It shortens the morning research workflow by turning Thinkorswim scanner exports into ranked, explainable opportunities, option-strategy illustrations, journal records, and evidence for improving the process over time.

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

The original workbook file itself is not retained. The database stores its
filename, byte size, SHA-256 identity, safe counts, and audit events. Historical
ticker rows are not retained: only the current bullish and bearish physical
rows and normalized validation results remain. Multi-sheet approval remains
disabled until worksheet selection is implemented.

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
