# Conviction Engine

## Naming decision

“Conviction engine” is retained as an internal product concept, but the user-facing MVP output is **Setup Alignment (0–100)**. “Conviction” describes the trader's belief and should not be manufactured by software. “Confidence” is reserved for statistically validated estimates.

## Three outputs, never one blended claim

### 1. Setup alignment

A deterministic score showing how strongly current observations match a versioned setup definition.

### 2. Evidence contribution

A ledger showing how the score was built:

| Component | Available points | Earned points | Evidence |
|---|---:|---:|---|
| Trend | 25 | 20 | Versioned rules and observed values |
| Momentum | 20 | 15 | Versioned rules and observed values |
| Volume | 15 | 10 | Versioned rules and observed values |
| Historical evidence | 30 | 0 | Locked until qualified backtest exists |
| Event context | 10 | 0 | Risk flag, not AI sentiment |

These numbers are illustrative, not approved weights.

The founder's initial scoring hypothesis is:

| Component | Illustrative points |
|---|---:|
| Trend | 20 |
| Momentum | 20 |
| Volume | 10 |
| ADX / trend strength | 15 |
| Volatility | 10 |
| Option liquidity | 10 |
| News/event context | 5 |
| Earnings risk | -10 |

This is a starting hypothesis, not a validated model. Before implementation, the positive-point maximum and treatment of negative risk adjustments must be normalized into an explicit 0-100 formula. Scheduled earnings is a deterministic event-risk input; AI may summarize the event but may not decide the numeric penalty.

### 3. Statistical evidence

Shown separately:

> Comparable setup cohort: 58% profitable at the defined exit, 312 observations, 95% interval 52%–63%, out-of-sample period Jan–Jun 2026, after modeled costs.

This is not automatically the probability that the current trade will win.

## Why the proposed “Confidence 91%” is rejected

Adding subjective weights to 91 out of 100 creates a score, not a 91% probability. Calling it confidence produces false precision. Trend, momentum, and volume are also correlated, so their weights cannot be interpreted as independent evidence. News is especially unsuitable as a fixed 10% component until event definitions and historical validation exist.

## Score definition

Each component specifies:

- input feature and source;
- formula and parameter values;
- condition and points;
- direction;
- timestamp/freshness rule;
- missing/invalid behavior;
- cap/floor;
- rationale; and
- tests.

The total is the sum of earned points under one immutable score version. Do not dynamically adjust weights based on AI output.

## Completeness and freshness

Show these beside the score:

- **Evidence completeness:** available required inputs / required inputs.
- **Freshness:** oldest material input and market session.

A high alignment score with incomplete or stale evidence must be visibly qualified.

## Weight governance

Initial weights are hypotheses. Change them only through a recorded proposal that includes:

- reason for change;
- comparison against the prior version and a simple baseline;
- in-sample and holdout results;
- sensitivity analysis;
- sample size and uncertainty;
- leakage review; and
- effective date.

Never tune weights repeatedly on the same test period.

## Event and news handling

Known scheduled events such as earnings are deterministic risk flags. AI may summarize source text later, but sentiment or “news confidence” cannot enter the score until the source set, classifier, timing, failure modes, and incremental out-of-sample value are validated.

## Display requirements

Every score view must answer:

- Which definition created this score?
- What data and timestamps were used?
- Which components added or removed points?
- What was missing?
- Is any historical evidence in-sample or out-of-sample?
- Is this a score or a calibrated probability?
- What evidence supports the setup?
- What belongs in the **Reasons I'm Wrong** section?

**High Conviction Bullish**, **High Conviction Bearish**, and **high-conviction watchlist** are permitted as names for the user's defined workflow categories. The UI must still state that setup alignment is rule matching, not confidence or an outcome promise.

## Applied manual setup-alignment slice

`manual-high-conviction-v1.0.0` is an experimental bridge while the imported
workbooks contain only symbols and Schwab observations are unavailable. The
user selects a current imported candidate and manually supplies price, market
capitalization, 20 EMA, 50 EMA, MACD state, RSI, ATR as a percentage of price,
ADX, average volume, and the directional 20-day high or low.

Each of the ten documented High-Conviction v1 rules is worth ten points. The
score is the unrenormalized sum of passed rules:

`setup_alignment = Σ(passed_rule_i × 10)`

Missing input earns zero points and reduces evidence completeness. The
interface does not publish or compare Setup Alignment until all ten rule
components are available. A failed rule remains explicit counter-evidence.

Threshold semantics for this version are:

- price and market capitalization use strict `>` boundaries at $20 and $5B;
- price is strictly above both EMAs for bullish candidates and strictly below
  both for bearish candidates;
- MACD state must exactly match the imported direction;
- RSI endpoints are inclusive: 55–70 bullish and 30–45 bearish;
- ATR/price, ADX, and average volume use strict `>` boundaries at 1.5%, 25,
  and 3 million shares;
- bullish proximity requires price to be from 0% through 2% below the supplied
  20-day high; bearish proximity requires price to be from 0% through 2% above
  the supplied 20-day low.

Observation source and time remain visible and user-entered. Only complete
assessments with both fields may be saved. Each save appends an owner-scoped
snapshot, and the database independently generates the versioned score from
the raw observations. Evidence and Reviews display only the latest saved
snapshot for each current candidate; earlier snapshots remain immutable audit
history. The version has no historical calibration and must never be described
as confidence, probability, expected return, or investment suitability.
