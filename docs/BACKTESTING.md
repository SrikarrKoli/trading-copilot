# Backtesting

## Purpose

Backtesting tests a precisely defined historical decision rule. It does not prove that a strategy will work in the future.

## Start early, expose later

Full backtesting is a later product phase, but reproducibility begins in Phase 1. Imports, scanner versions, features, timestamps, and user decisions must be stored in a form that can later be replayed without using future information.

## Required test specification

Every test defines:

- hypothesis and decision rule;
- universe and exclusions;
- observation frequency and timezone;
- feature computation timing;
- entry signal and earliest executable entry;
- instrument selection;
- position sizing;
- exit, stop, expiry, and overlapping-position rules;
- commissions, fees, spread, and slippage;
- corporate-action handling;
- benchmark;
- train/validation/test or walk-forward windows; and
- code, data, scanner, score, and strategy versions.

## Bias controls

- **Look-ahead:** no field calculated with data unavailable at decision time.
- **Survivorship:** point-in-time universe includes delisted and changed symbols where applicable.
- **Selection:** failed imports and excluded rows remain countable.
- **Corporate actions:** splits, dividends, mergers, and adjusted-price policy are explicit.
- **Multiple testing:** track all tested variants, not only winners.
- **Overfitting:** lock a holdout period and avoid tuning on it.
- **Fill realism:** do not assume midpoint fills without sensitivity analysis.
- **Options history:** use historical chains/quotes for option claims; an underlying-price proxy must be labeled.

## Metrics

Always report:

- test period and number of independent opportunities/trades;
- win definition and win rate;
- average and median return;
- average winner and loser;
- expectancy;
- profit factor;
- maximum drawdown;
- exposure/time in market;
- turnover and modeled costs;
- dispersion and confidence interval or bootstrap range; and
- baseline comparison.

For option strategies also report capital-at-risk convention, assignment handling, liquidity filters, and expired-worthless logic.

## Metric definitions

`profit_factor = gross_profit / abs(gross_loss)`. A zero gross loss produces an undefined/infinite value and must not be silently capped.

`expectancy = win_rate × average_win + loss_rate × average_loss`, with losses represented as negative values.

A “321 trades, 64% win rate” statement is incomplete without cohort, dates, entry/exit definitions, costs, dependence/overlap, and holdout status.

## Comparison hierarchy

1. No-trade/reference workflow.
2. Simple baseline such as equal-weight directional exposure.
3. Prior released scanner/strategy version.
4. Proposed version.

Complexity is justified only by incremental, out-of-sample value.

## Result status

- **Exploratory:** used to form or tune a hypothesis.
- **Holdout evaluated:** run once on a locked test set.
- **Walk-forward evaluated:** repeated temporal validation.
- **Production monitored:** live paper/decision outcomes compared with expectations.

These labels describe evidence maturity, not profitability.

## Reproducibility manifest

Each run stores parameter JSON, dataset snapshot/hash, feature versions, code commit, environment, random seed if applicable, start/end times, logs, status, and result tables. Runs are immutable; a correction creates a linked successor.

## Personal learning

Journal analyses need minimum cohort sizes and must show raw counts. Tags such as “chased breakout” are user-defined or transparently classified. The system may say “15 of 20 tagged losses involved X”; it may not say X caused the losses without a defensible comparison.

## Initial directional outcome capture

The founder's initial definition of a win is “the scanner got the direction right.” That is not yet measurable without a time horizon and return threshold. Until those are chosen, store forward underlying returns at 1, 5, 10, and 20 trading days after the scan, plus maximum favorable and adverse excursion over each window.

For a bullish setup, a positive forward return is directionally correct; for a bearish setup, a negative forward return is directionally correct. Report raw return and direction separately. Do not label a row “win” merely because it moved by an immaterial amount, and do not treat underlying direction as proof that a particular option contract would have been profitable.
