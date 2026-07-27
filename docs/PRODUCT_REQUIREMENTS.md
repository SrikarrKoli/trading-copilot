# Product Requirements

## Product objective

Create a trustworthy trading operating system that turns imported Thinkorswim scan data into reproducible, user-controlled reviews and connects those reviews to option calculations, journal evidence, and scanner validation.

## Product roles

For the MVP there is one authenticated trader. The design should retain `user_id` ownership so future multi-user support is possible, but no collaboration behavior is required.

## Phase 1: deterministic MVP

### Required capabilities

#### Excel workbook import

- Accept supported `.xlsx` workbooks that the user manually provides after running scanners in Thinkorswim.
- Use `BullishList.xlsx` and `BearishList.xlsx` as the canonical example fixtures without depending on their exact filenames.
- Require the user to select or confirm direction; filename-derived direction is only a hint.
- Preserve the original file, SHA-256 hash, filename, import time, detected schema, and declared market-data timestamp.
- Read only column A from the selected worksheet.
- Detect the canonical Thinkorswim layout (`Watchlist Scanner` in row 1, `Results` in row 2, `Symbol` in row 3) and treat nonblank cells beginning at row 4 as stock identifiers.
- Ignore all other workbook columns.
- Record the worksheet, detected layout/schema, preamble and header rows, source row number, raw column-A value, normalized symbol, row counts, user-declared direction, and `thinkorswim_manual_export` source.
- Preview parsed rows and validation errors before committing.
- Trim identifiers, normalize symbols to uppercase, report blank cells, and flag invalid identifiers.
- Preserve duplicate source rows for audit while creating only one candidate per normalized symbol within the import.
- Never discard leading rows without detecting the full supported preamble/header layout or obtaining confirmation for an ambiguous layout.
- Reject or quarantine a missing column A, ambiguous header, invalid symbol, and unsupported workbook or worksheet layout.
- Make a repeated import with the same user and file hash idempotent.
- Never treat upload time as the market observation time.
- Never execute workbook macros, formulas, external links, or embedded content.

#### Saved scans

- Save an immutable scan run linked to its import, scanner definition version, score version, and row-level outputs.
- Allow a user-defined name and notes.
- Preserve historical results if scanner rules later change.
- Support filtering, sorting, and ticker search.

#### Watchlists

- Support bullish, bearish, and neutral/research states; direction must not be inferred merely from list placement.
- Combine results from multiple scanners into high-conviction watchlists without manual copying.
- Deduplicate symbols while retaining every contributing scanner and scan run.
- Record who/what added an item, when, from which scan, and optional thesis notes.
- Allow archive/remove without deleting history.

#### Setup alignment score

- Calculate a deterministic 0–100 score from explicit, versioned components.
- Display component points, raw input value, rule, data timestamp, and missing-data treatment.
- Label the output “Setup alignment,” not probability or confidence.
- Never let a missing component silently become a positive value.

#### Dashboard

- Show Top 10 bullish and Top 10 bearish opportunities, upcoming earnings, high-IV names, gap-up and gap-down results, unusual option volume, setup alignment, expected move, and grounded news summaries when those data are available.
- Show latest import status, saved scans, review queue, combined watchlists, score breakdowns, and data freshness.
- Make stale, incomplete, or invalid data visually obvious.
- Provide a path from every summary value to its source rows.

#### Settings and alerts

- Allow versioned configuration of thresholds such as ATR%, ADX, average volume, proximity to highs/lows, and event-risk windows without editing ThinkScript or application code.
- Support in-app alerts for configured scanner events, initially Gap Up, Gap Down, Short Squeeze, and selected custom scanners.
- Record scanner version, observation time, delivery state, and a deduplication key for every alert.

#### Decision capture

- Allow save, dismiss, defer, or watchlist actions.
- Record a reason code and optional note.
- Do not include an order ticket, broker link that pre-fills an order, or action named “Buy.”

### MVP acceptance criteria

- Each known example workbook imports to the same normalized rows on repeated runs.
- Invalid fixtures produce specific workbook, worksheet, and column-A row errors and do not partially commit.
- Every displayed score can be recalculated exactly from stored inputs and versioned rules.
- A scan saved before a rule change retains its original score and explanation.
- An authenticated user cannot access another user's rows.
- Core workflow works without an OpenAI API key.
- Automated tests cover parsers, score boundaries, permissions, and critical dashboard paths.

## Phase 2: deterministic chart analysis

Display candlestick and volume charts and calculate EMA, Bollinger Bands, Ichimoku, trend, momentum, volume, ATR/ATR%, RSI, MACD, ADX, VWAP, expected move, support, and resistance. Each indicator requires:

- exact formula and parameters;
- adjusted/unadjusted price policy;
- session and timeframe;
- warm-up requirement;
- source and timestamp; and
- tests against fixed fixtures or a trusted reference.

“Support” and “resistance” require an algorithm; they may not be presented as objective facts without one.

## Phase 3: AI explanation

AI converts structured facts into a concise analysis with observed evidence, counter-evidence, missing data, and known event risks. AI must not calculate indicators, produce a trade directive, or output an unsupported confidence number.

## Phase 4: option strategy engine

Calculate and compare user-selected strategy illustrations. Initial structures: long call/put, vertical debit spread, vertical credit spread, iron condor, and calendar spread. Add strategies one at a time with tested payoff functions.

The system must show:

- legs, quantities, net debit/credit, and pricing timestamp;
- maximum profit/loss, including “unbounded” where applicable;
- break-even at expiration;
- payoff graph and scenario table;
- IV and Greek context when data supports it;
- assumptions, commissions, and slippage; and
- probability only when the model and calibration are disclosed.

## Phase 5: trade journal

Capture ticker, contributing scanner(s), setup-alignment score, reasons and counter-evidence, strategy, plan, thesis, legs, intended risk, entry/exit fills, fees, timestamps, P/L, outcome, tags, mistakes, lessons, and retrospective notes. Edits must be auditable.

Every reviewed trade idea must include a **Reasons I'm Wrong** section containing contradictory evidence, invalidation conditions, missing information, and event risks.

## Phase 6: backtesting

Run versioned tests using point-in-time features, explicit entry/exit rules, costs, and holdout evaluation. See [BACKTESTING.md](BACKTESTING.md).

## Phase 7: learning engine

Describe statistically supportable patterns in the user's history. Every insight must include the cohort definition, sample size, baseline, magnitude, uncertainty, and data cutoff. The user may reject or annotate an insight. The engine must not claim causation from correlation.

## Non-functional requirements

- Accessibility: keyboard navigation, semantic labels, and WCAG 2.2 AA target.
- Performance: common saved-scan views respond within 500 ms at expected personal-use scale.
- Reliability: imports are transactional and retry-safe.
- Privacy: no market file or journal data is sent to AI unless explicitly required and disclosed.
- Observability: structured errors and audit events contain identifiers, not raw confidential payloads.
- Portability: user data can be exported in documented formats.

## Out of scope

Autotrading, broker order submission, portfolio custody, guaranteed returns, opaque ranking, social trading, copy trading, tax accounting, and personalized financial-advice claims.
