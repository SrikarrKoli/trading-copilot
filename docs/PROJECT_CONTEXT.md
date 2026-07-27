# Project Context

## Mission

Help Sagar make better options-trading decisions faster and more consistently while keeping every trading decision under his control.

## The decision this product supports

Trading Copilot narrows a large market into inspectable opportunities, presents reproducible evidence, calculates strategy mechanics, and measures outcomes. It does not decide whether the user should trade.

## Initial user and boundary

This is personal, single-user software for Sagar, not a commercial SaaS product. Multi-user collaboration, subscriptions, public trade publishing, brokerage connectivity, and automated execution are out of scope. Authentication and ownership controls still protect personal trading and journal data.

## Current workflow problem

The current morning workflow requires running multiple Thinkorswim scanners, opening roughly 50 charts, checking news and earnings, inspecting option chains, and manually narrowing the result to two or three possible trades. Results may also be copied into spreadsheets or watchlists by hand.

Trading Copilot should reduce this to:

```text
Run scanners -> Import results -> Combine watchlists -> Rank opportunities
-> Explain supporting and contradictory evidence -> Compare option structures
-> User decides and executes in Thinkorswim -> Journal -> Learn
```

## Product model

The system has four distinct layers:

1. **Observation:** imported market facts and user-entered facts.
2. **Calculation:** indicators, filters, scores, and option payoff mechanics.
3. **Evidence:** historical results and the user's journal, with sample sizes and uncertainty.
4. **Explanation:** plain-language descriptions generated from structured facts.

The explanation layer may never silently alter the underlying facts.

## Core product distinction

Trading Copilot must distinguish three concepts:

- **Setup alignment score:** deterministic points awarded under a versioned rule set.
- **Evidence contribution:** how each component contributed to that score.
- **Statistical confidence:** a calibrated estimate based on a defined historical cohort, including sample size, uncertainty, and test window.

Only the third may be expressed as a probability, and only after validation.

## Success definition

The product succeeds when it improves decision process quality, not when a short run of trades makes money.

Primary product KPIs:

- **Review time:** median time from completed import to a saved or dismissed review decision.
- **Evidence completeness:** percentage of reviewed opportunities with all required deterministic evidence and provenance present.
- **Journal completeness:** percentage of opened trades with thesis, setup version, entry, exit, and outcome captured.

Guardrails:

- zero orders submitted or staged by the product;
- zero unlabeled probabilistic claims;
- 100% of displayed scores reproducible from stored inputs and a versioned rule set;
- backtest results never shown without sample size, test period, costs, and methodology.

Profitability is an outcome to analyze, not a reliable product KPI during early development.

## Important unknowns

- Which worksheet should be selected when an input workbook contains more than one sheet.
- Whether future exports will preserve the observed three-row column-A preamble (`Watchlist Scanner`, `Results`, `Symbol`) and whether all future data values will remain ticker symbols rather than company names.
- How the user will declare the scan's market observation time and contributing scanner, because those are not imported from other workbook columns.
- Intended trading horizons: intraday, swing, earnings, or multiple modes. In plain language: how long after a scan the user expects the directional idea to play out.
- Which instruments are in scope: US equities and equity options only?
- The definition of a “win,” entry, exit, fill, and holding period.
- Risk limits and account constraints needed for strategy illustrations.
- Alert delivery channels and acceptable market-data delay.

These unknowns are tracked as decisions, not filled with guessed defaults.
