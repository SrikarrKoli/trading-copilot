# Scanners

## Definition

A scanner is a deterministic, versioned filter-and-ranking definition applied to point-in-time data. It produces candidates, not trade recommendations. Every filter is a hypothesis that must eventually be tested against historical results; popularity is not evidence for retaining a filter.

## Scanner contract

Each scanner definition includes:

- stable ID, name, semantic version, and lifecycle status;
- intended market, timeframe, session, and direction;
- required inputs, minimum history, universe, and exclusions;
- filter rules, configurable thresholds, and score definition ID;
- tie-break rules and missing-data policy;
- author, rationale, effective date, change note, and code version.

Each ticker output includes its included/excluded state, rule results and source values, setup-alignment breakdown, observation time and freshness, missing fields, and scanner/score versions.

## Current scanner catalog

The Thinkorswim workflow includes:

| Group | Scanners |
|---|---|
| Bullish | Momentum Weekly Options; Intraday Relative Volume; Gap Up Continuation; Swing Trade; High Conviction Bullish |
| Bearish | Gap Down; Short Squeeze; High Conviction Bearish |
| Options | Option Liquidity; Option Contract Finder; Unusual Options Activity |

Phase 1 imports only stock identifiers from column A. Scanner name is therefore supplied as import-level metadata or the run is labeled as an aggregated bullish/bearish export. Reimplementing scanner logic inside Trading Copilot is incremental; do not invent logic when a Thinkorswim definition has not been captured.

## High-conviction v1 hypotheses

Exact indicator parameters, price basis, session behavior, and exported fields must be recorded in the executable scanner version.

### High Conviction Bullish v1

- Price > $20.
- Market capitalization > $5 billion.
- Price above the 20 EMA.
- Price above the 50 EMA.
- MACD bullish.
- RSI from 55 through 70.
- ATR as a percentage of price above a configurable threshold; default 1.5%.
- ADX > 25.
- Average volume > 3 million shares.
- Price within 2% of the 20-day high.

### High Conviction Bearish v1

- Price > $20.
- Market capitalization > $5 billion.
- Price below the 20 EMA.
- Price below the 50 EMA.
- MACD bearish.
- RSI from 30 through 45.
- ATR as a percentage of price above a configurable threshold; default 1.5%.
- ADX > 25.
- Average volume > 3 million shares.
- Price within 2% of the 20-day low.

Threshold inclusivity must be explicit. If an existing Thinkorswim scan differs—for example, absolute ATR rather than ATR% or SMA rather than EMA—the imported source definition and discrepancy must be preserved and resolved before claiming parity.

## Combined watchlists

High-conviction watchlists combine multiple scanners without manual copying. They deduplicate symbols while retaining all contributing scanners, scan runs, observation times, and rule evidence. The number or diversity of matches may add points only when a versioned score definition explicitly says so.

## Direction and ranking

"Bullish candidate" and "bearish candidate" mean that a symbol matched the named definition at the observation time; neither is a prediction. Rank by deterministic setup alignment and documented tie-breakers. Never randomize ties or let AI silently change inputs, weights, or order.

## Missing data

- A missing required field excludes the row or marks it invalid.
- A missing optional field adds no positive points and reduces a separate completeness measure.
- Do not renormalize a partial score to 100 unless the definition explicitly permits it and the UI discloses the reduced evidence base.
- Never impute a market fact with AI.

## Deterministic explanation

The core product must explain a result without AI:

> Matched 4 of 6 bullish conditions. Price was above the configured trend averages; momentum was positive; relative volume was below threshold. Data as of 10:35 AM CT.

## Versioning and validation

Any change to a formula, threshold, indicator parameter, universe, missing-data policy, direction rule, or weight creates a new version. Historical results retain their original version.

A scanner cannot be labeled **validated** until it has threshold and null-boundary tests, a documented rationale, point-in-time holdout or walk-forward results, realistic costs where trades are simulated, sample-size reporting, and a simple baseline comparison. Until then it is **defined** or **experimental**.

## Applied manual evidence bridge

Until a qualified market-data adapter supplies row-level observations, the
Evidence workspace lets the owner manually evaluate a current imported symbol
against the ten High-Conviction v1 hypotheses. Score definition
`manual-high-conviction-v1.0.0` assigns ten points per passed rule and refuses
to publish or compare an incomplete result. It records no claim that Trading
Copilot reproduced the Thinkorswim scanner.

The bridge can append a complete, sourced, timestamped assessment to the manual
evidence ledger. Saving never alters candidate order. Evidence and Reviews show
the latest saved snapshot only for a current candidate, while earlier
snapshots remain auditable after another assessment is saved. Setup Alignment
is not confidence or a recommendation. See `CONVICTION_ENGINE.md` for the exact
threshold and missing-data contract.
