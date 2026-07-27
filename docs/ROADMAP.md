# Roadmap

## Roadmap principle

Ship trust before intelligence. Each phase must make the next phase measurable and reproducible. Dates are estimates only after real Thinkorswim exports and any trusted spreadsheet logic have been audited.

## Phase 0 — Product definition

**Outcome:** approved source of truth and implementation-ready MVP definitions.

- Validate column-A parsing against `BullishList.xlsx`, `BearishList.xlsx`, and edge-case workbook exports.
- Document scanner formulas, parameters, and timeframes separately from the workbook importer.
- Approve score terminology, initial components, and missing-data behavior.
- Decide trading horizons, instrument universe, and risk constraints.
- Identify acceptance fixtures and resolve or defer open decisions.

## Phase 1 — Import, store, and review

**Outcome:** a deterministic workflow that replaces manual copying.

- Supabase authentication and row-level security.
- Manual Thinkorswim `.xlsx` upload, preview, validation, immutable raw storage, and idempotent imports.
- Saved scan runs with source scanner identity.
- Combined high-conviction watchlists with symbol deduplication and scanner provenance.
- Dashboard, review queue, filtering, watchlists, and decision capture.
- Initial setup-alignment breakdown and data-freshness states.

## Phase 1.5 — Measurement foundation

**Outcome:** future tests can replay historical definitions.

- Definition/version registry and point-in-time timestamps.
- Feature fixtures, result manifests, and baseline statistics.
- Lightweight journal and observational outcome capture.

## Phase 2 — Indicator and conviction engines

**Outcome:** tested chart evidence and deterministic opportunity ranking.

- EMA, Bollinger Bands, Ichimoku, volume, ATR/ATR%, RSI, MACD, ADX, VWAP, expected move, and approved support/resistance algorithms.
- Versioned score components, configurable thresholds, deterministic ranking, and visible reasons.
- High Conviction Bullish and Bearish v1 parity with captured definitions.

A real OHLCV source may be required because scanner workbooks may not contain enough history.

## Phase 3 — AI explanation, news, and risk

**Outcome:** grounded prose over structured evidence.

- News summaries with sources and timestamps.
- Earnings and event-risk flags.
- Supporting evidence, **Reasons I'm Wrong**, missing data, and neutral review questions.
- In-app Gap Up, Gap Down, Short Squeeze, and custom-scanner alerts.
- Deterministic fallback, schema validation, prompt evaluation, and privacy controls.

AI remains optional to the core workflow.

## Phase 4 — Option strategy lab

**Outcome:** deterministic payoff and risk comparisons.

1. User-entered or imported contracts and expiration payoff.
2. Live or delayed option-chain adapter.
3. Long calls/puts, debit and credit spreads, iron condors, and calendar spreads.
4. Expected move, IV/IV rank, Greeks, liquidity, and earnings-aware analysis with disclosed assumptions.
5. Statistically qualified probability estimates only if model and calibration requirements are met.

## Phase 5 — Trade journal and performance analytics

**Outcome:** complete decision-to-outcome records.

- Ticker, scanner provenance, score, reasons, counter-evidence, strategy, fills, fees, P/L, mistakes, and lessons.
- Review workflows and scanner-level performance analytics.
- Personal cohort comparisons that show sample size and uncertainty.

## Phase 6 — Historical validation and optimization

**Outcome:** reproducible scanner and strategy evidence.

- Signals generated, win rate and definition, average winner/loser, profit factor, maximum drawdown, and market-regime results.
- Point-in-time features, bias controls, holdout/walk-forward evaluation, realistic costs, baselines, and immutable result manifests.
- Underlying-only tests may evaluate scanner direction but cannot validate option execution claims.

Every filter and weight remains a hypothesis until this evidence supports it.

## Phase 7 — Learning engine

**Outcome:** transparent candidate patterns in Sagar's journal.

Start with deterministic cohort comparisons. AI may phrase and explore statistically supportable results, but every insight must disclose its cohort, sample size, baseline, uncertainty, and data cutoff and must not claim causation from correlation.

## Cross-cutting release gates

Every phase requires acceptance criteria, tests proportional to risk, privacy and permissions review, provenance and versioning, empty/error/stale states, user-visible limitations, and a decision-log update.
