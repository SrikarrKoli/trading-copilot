# Decision Log

This file records durable decisions and unresolved founder choices. Accepted decisions should include date, owner, rationale, and consequences.

## Accepted design decisions

### D-001 — Human-controlled decision support

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** The product will not submit, stage, or approve trades.
- **Rationale:** Human control is the mission and the key safety boundary.

### D-002 — Deterministic-first architecture

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** Indicators, scores, payoff mechanics, and performance metrics use versioned code, not AI.
- **Consequence:** AI is noncritical-path and can fail without disabling the core product.

### D-003 — Score is not confidence

- **Date:** 2026-07-26
- **Status:** Proposed
- **Decision:** The MVP displays “Setup Alignment (0–100).” It does not display an outcome probability.
- **Rationale:** Weighted conditions do not create calibrated probability.

### D-004 — Evidence contribution is transparent

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** Every score exposes component, raw input, rule, points, timestamp, missing-data treatment, and version.

### D-005 — Backtest foundations begin in MVP

- **Date:** 2026-07-26
- **Status:** Proposed
- **Decision:** Point-in-time data, immutable definitions, and result provenance are Phase 1 concerns; the full backtesting product remains Phase 6.

### D-006 — Modular monolith

- **Date:** 2026-07-26
- **Status:** Proposed
- **Decision:** Use a modular monolith with pure TypeScript domain packages and background jobs for long-running work.

### D-007 — Supported Next.js LTS

- **Date:** 2026-07-26
- **Status:** Proposed
- **Decision:** Start on current Active LTS rather than hard-coding Next.js 15. Pin exact versions at project bootstrap.
- **Rationale:** Next.js 16.x is Active LTS and 15.x is Maintenance LTS as of this date.

### D-008 — Personal, single-user scope

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** The product is personal software for Sagar. Manually supplied Thinkorswim scanner `.xlsx` workbooks are the Phase 1 input; Thinkorswim remains the scanner and manual execution platform.
- **Consequence:** Collaboration, subscriptions, public sharing, and commercial-product requirements are out of scope. Authentication and data ownership remain in the architecture so the boundary can change deliberately later.

### D-009 — Trading operating system, not AI stock picker

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** The product workflow is Scan -> Import -> Rank -> Explain -> Select Strategy -> Execute in Thinkorswim -> Journal -> Learn.
- **Consequence:** AI is an optional explanation and synthesis layer. It cannot originate opaque signals or become a prerequisite for deterministic scanning, ranking, calculations, or journaling.

### D-010 — Column A is the complete workbook payload

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** Phase 1 imports only column A from `BullishList.xlsx` and `BearishList.xlsx` as the stock identifier list. All other columns are ignored.
- **Consequence:** Direction, scanner identity, and observation time require import-level metadata. Indicators, prices, option data, news, and events must come from separate sources.

### D-011 — Permanent Supabase UUID owns imported data

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** The single permanent Supabase Auth user configured by `AUTH_OWNER_EMAIL` owns imported data through its `auth.users.id` UUID.
- **Rationale:** Email addresses can change and are not suitable relational ownership keys. A permanent Auth UUID works directly with `auth.uid()` and RLS.
- **Consequence:** The owner signs in through a one-time email link; the product has no password entry, reset, or update flow. Cookie-backed access and refresh tokens retain the session. If cookies are cleared, requesting another link for the same Auth account restores access under the same UUID.
- **Security boundary:** A development-only authentication bypass is not a database identity and must not be used to weaken RLS. It remains temporary only until the permanent browser session is confirmed.

### D-012 — Physical workbook location identifies imported rows

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** A physical row is unique by `(import_batch_id, source_sheet_name, original_row_number)`.
- **Rationale:** Ticker and direction are row values that may be malformed, normalized, or corrected. They cannot safely identify the source location.
- **Consequence:** Filename comes from the parent batch; sheet and row number come from the row record. Repeated ticker occurrences on distinct physical rows remain stored while that direction is current, then are deleted on replacement.

### D-013 — Import duplicate definitions remain separate

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** File duplicates, physical-row duplicates, and repeated ticker occurrences are separate concepts.
- **Consequence:** An active `(owner_id, direction, file_sha256)` match returns the current batch; the physical-row constraint rejects duplicate insertion of one source location; repeated tickers on different current rows are preserved and may be classified as duplicate occurrences.
- **Metadata guarantee:** Replacement is explicit rather than a duplicate side effect. Superseded batch and audit metadata remain, while their ticker rows are deleted under D-018.

### D-014 — Trusted server owns import and audit mutations

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** Browser Data API access to the import tables is read-only. The Next.js approval route and Supabase Edge Function verify the permanent owner session, then a service-only PostgreSQL transaction performs import and audit mutations.
- **Rationale:** Granting browser INSERT on audit history would allow arbitrary event fabrication. The audit stream must be written together with the operation it describes.
- **Security boundary:** No service-role, secret key, database credential, or session token may be exposed in browser code. No `SECURITY DEFINER` function is used merely to bypass permissions.

### D-015 — Stored counters require transactional child reconciliation

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** The database CHECK enforces equality among stored batch counters, while the trusted import transaction separately reconciles those counters against the applicable current bullish or bearish table.
- **Rationale:** A PostgreSQL row CHECK cannot validate aggregate contents of a child table.
- **Consequence:** A completed import must not commit until stored counters and the child-row aggregate agree.

### D-016 — Import approval is one idempotent transaction

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** Preview remains local and read-only. Explicit approval causes the server to reparse and hash the original bytes, and `commit_import` atomically writes rows, reconciled counters, completion status, and audit events.
- **Failure behavior:** A row-processing error rolls back every row from that attempt. The batch is marked failed with an allowlisted error code; a retry of the same owner/hash reuses the failed empty batch.
- **Duplicate behavior:** A completed owner/direction/hash match returns the existing active batch. A different file for that direction invokes the explicit replacement behavior in D-018.

### D-017 — Ambiguous multi-sheet imports are rejected

- **Date:** 2026-07-26
- **Status:** Accepted for Step 4
- **Decision:** The existing preview may display the first sheet and warn about additional sheets, but approval rejects a workbook containing more than one sheet until worksheet selection exists.
- **Rationale:** Silently committing the first sheet would make the approval ambiguous and could persist the wrong physical source locations.

### D-018 — Bullish and bearish imports are replaceable current state

- **Date:** 2026-07-26
- **Status:** Accepted
- **Decision:** `bullish_stocks` and `bearish_stocks` are separate tables containing only the current imported lists. Importing one direction deletes that direction's current rows before inserting the replacement.
- **Transaction boundary:** Delete and insert occur in one database subtransaction. A failed replacement rolls the deletion back and restores the previous usable list.
- **Audit boundary:** Historical ticker rows are not retained. `import_batches` and `import_audit_history` retain safe metadata, counts, hashes, timestamps, status transitions, and replacement batch IDs.
- **Consequence:** Bullish replacement does not change bearish rows, and bearish replacement does not change bullish rows. A superseded batch may retain metadata but has no retained ticker rows.
- **Supersedes:** The historical stock-row retention portion of D-012, D-013, and D-016.

### D-019 — Candidate review actions are append-only

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** Save, dismiss, defer, and watchlist decisions are recorded as an append-only `review_actions` ledger. The latest action for one owner, import batch, direction, and symbol is its current review state.
- **Rationale:** Replacing a mutable status would erase the decision sequence and weaken future journal and learning evidence.
- **Security boundary:** The authenticated browser may select and insert only its own rows. It cannot update or delete review history. The server revalidates the current imported candidate and derives its source row instead of trusting submitted provenance.
- **Incremental boundary:** Until versioned `scan_results` exist, actions retain import-level provenance. A later migration may add a scan-result reference without deleting the import link.

### D-020 — Daily scanner state and deliberate watchlists have different lifetimes

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** Bullish and bearish scanner rows remain replaceable current state under D-018. A symbol persists beyond that replacement only when the owner deliberately adds it to a named watchlist.
- **Membership:** One ticker may have only one active membership in a given list. Repeated scanner appearances add distinct source-provenance rows instead of duplicating the active symbol. Archived memberships remain historical and may later be added again.
- **Transaction boundary:** A watchlist assignment revalidates the active candidate and owner list, creates or reuses the membership, records its import/direction/source-row provenance, and appends the `watchlisted` review decision in one authenticated database transaction.
- **Deletion behavior:** Lists and memberships use soft archive in the normal product workflow. Import replacement does not archive or delete deliberate watchlist membership.

### D-021 — Manual trade history is an append-only snapshot ledger

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** `trades` stores only immutable identity and optional watchlist provenance. Every initial plan, plan correction, status change, and reflection appends a complete state snapshot to `journal_entries`; the newest snapshot is current.
- **Rationale:** Mutable trade rows would make later corrections indistinguishable from the original decision. Full snapshots keep the exact thesis, plan, counter-evidence, values, and status visible at every point in the sequence.
- **Required evidence:** Every trade snapshot contains a nonempty thesis, trade plan, and **Reasons I’m Wrong** section. Reflections may additionally capture mistakes, lessons, and tags.
- **Financial boundary:** Intended risk, signed entry/exit net values, fees, and realized P/L are manual facts supplied by the owner. They are not broker-reconciled or inferred by the application.
- **Security and privacy:** Owner RLS applies to both tables. Normal authenticated access has no update or delete grant. Journal text remains private and is not sent to AI.
- **Broker independence:** Journal creation and review work without Schwab credentials or market-data connectivity. A later adapter may reconcile fills by appending sourced events rather than rewriting manual history.

### D-022 — Saved scans are immutable imported-candidate snapshots

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** A saved scan copies the current distinct ticker list into immutable `scan_runs` and `scan_results` rows linked to the exact import batch and immutable scanner-definition version.
- **Definition boundary:** Definition versions use a stable key and semantic version. The current product creates only `experimental` descriptions because the imported workbooks contain identifiers but not the exact executable Thinkorswim rule set. Any rule change creates a new version.
- **Evidence boundary:** `run_kind = 'import_snapshot'` means the platform preserved imported candidates; it does not mean Trading Copilot executed, reproduced, or validated the scanner. Candidate order is source order, not a score or recommendation rank.
- **Deduplication:** One saved result is created per distinct normalized ticker. The earliest source row determines candidate order and `source_occurrence_count` retains how many valid/duplicate physical occurrences were present.
- **Lifetime:** Ordinary bullish and bearish rows remain replaceable current state under D-018. A saved result intentionally survives later replacement because the owner explicitly preserved that snapshot.
- **Transaction and security:** Saving revalidates owner, completed batch, current-row presence, and direction compatibility, then inserts the run and every result atomically. Owner RLS applies to all three tables and normal authenticated access has no update or delete grant.

### D-023 — Manual option illustrations use a pure expiration-payoff engine

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** Engine `1.0.0` calculates long calls, long puts, bull call debit spreads, and bear put debit spreads from manual bid/ask inputs using midpoint, natural, or explicit manual fills.
- **Calculation boundary:** Premiums are per share and position amounts use contract quantity and multiplier. Estimated total fees reduce every expiration outcome and are included in maximum loss, maximum profit, and break-even calculations.
- **Data boundary:** Manual quote source and optional quote time are displayed. Missing expected move is labeled unavailable. No live price, volatility, Greek, probability, buying-power, tax, assignment, exercise, dividend, or broker-margin value is inferred.
- **Product language:** Outputs are strategy illustrations, not prices, forecasts, probability estimates, or trade recommendations. Expiration payoff is explicitly distinguished from pre-expiration value.
- **Persistence and execution:** Calculations are client-side and ephemeral. They do not write to Supabase, create a journal entry, or transmit an order.
- **Incremental scope:** Credit spreads, iron condors, and calendars remain deferred until their collateral, assignment, and multi-expiry behavior has dedicated algebraic and boundary testing.

### D-024 — Manual option comparison preserves a common market baseline

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** Up to four manual illustrations may be compared only when their normalized symbol, entered spot price, and expiration match. Their strategy, strikes, quantity, premiums, pricing assumption, and fees may differ.
- **Visualization boundary:** All structures use one underlying-price axis containing each exact strike, break-even, and the entered spot. This permits payoff-shape comparison without implying that the manually entered quotes are synchronized or live.
- **Freshness boundary:** Each illustration retains and displays its own optional quote time. Missing quote times remain visibly missing rather than being inferred.
- **Product language:** The comparison exposes capital, maximum loss/profit, break-even, finite risk/reward, and payoff-shape tradeoffs. It does not rank, score, recommend, or estimate the probability of a structure.
- **Persistence:** The set remains browser memory only. It is not saved to Supabase, written to the journal, restored after navigation, or sent to a broker.

### D-025 — Initial Setup Alignment is a complete manual rule ledger

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** Score definition `manual-high-conviction-v1.0.0` evaluates the ten documented High-Conviction v1 rules at ten points each from owner-entered observations. The 0–100 result is deterministic rule alignment, not statistical confidence.
- **Missing-data boundary:** Missing inputs earn no points and lower a separate evidence-completeness measure. The UI does not publish or compare Setup Alignment until all ten components are present; incomplete scores are not renormalized.
- **Threshold boundary:** Price, market capitalization, ATR/price, ADX, and average volume use strict greater-than thresholds. RSI endpoints and directional 20-day high/low proximity from 0% through 2% are inclusive. EMA comparisons are strict and MACD state must exactly match direction.
- **Provenance:** The selected symbol and direction come from the current owner-scoped Supabase candidate read. Market observations, source label, and observation time are manually entered and visibly labeled; the application does not claim to have reproduced the Thinkorswim scan.
- **Comparison language:** Only complete assessments enter a chart sorted by Setup Alignment and then symbol. It is a review order, not a prediction, expected-return ranking, suitability determination, or instruction to invest.
- **Persistence:** The original browser-memory bridge was superseded by the append-only persistence boundary in D-026 while retaining this score-version contract.

### D-026 — Complete manual evidence is saved as an append-only ledger

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** A complete D-025 assessment may be explicitly saved only when it includes a nonempty observation source and valid observation timestamp. Each save creates a new immutable owner-scoped row; it never updates or deletes an earlier assessment.
- **Calculation boundary:** The server reruns `manual-high-conviction-v1.0.0`, revalidates that the ticker is still in the selected current import, and writes raw observations. A stored generated column independently derives Setup Alignment from those observations; the action reports success only when the database and server scores agree.
- **Read boundary:** Evidence and Reviews show the latest saved snapshot for each current `(import batch, direction, ticker)` only. Older snapshots remain audit history but do not accumulate as duplicate chart bars or score badges.
- **Daily replacement boundary:** The current candidate lists continue to be replaceable. A saved assessment does not keep an old ticker in the current Evidence chart or Reviews queue; it preserves evidence provenance for later analysis.
- **Security boundary:** Authenticated owners receive only `SELECT` and `INSERT`; RLS scopes both operations to `auth.uid()`. Normal owner `UPDATE` and `DELETE` are intentionally unavailable.
- **Product language:** Persistence does not upgrade rule alignment into confidence, probability, expected return, suitability, or an investment recommendation.

### D-027 — Overview ranks only current candidates with complete saved evidence

- **Date:** 2026-07-27
- **Status:** Accepted
- **Decision:** Overview joins each current imported candidate to the latest D-026 assessment for the exact `(import batch, direction, ticker)` identity. Candidates with saved evidence sort by Setup Alignment descending; ties use original workbook row and then ticker. Candidates without a complete saved assessment follow in source order and remain labeled “Needs assessment.”
- **Freshness boundary:** An assessment from an older replaced import cannot cause its ticker to reappear or attach to a new import. Overview is current workflow state, not historical research storage.
- **Product language:** The dashboard calls the metric Setup Alignment and states that it is rule matching rather than confidence, probability, or a recommendation.
- **Scope:** This is a read-only command-center view. It does not change candidate order in storage, modify evidence history, or place a trade.

### D-028 — Saved option illustrations preserve raw assumptions and journal provenance

- **Date:** 2026-07-28
- **Status:** Accepted
- **Decision:** An owner may explicitly save a completed D-023 illustration as immutable `option_illustrations` and ordered `option_illustration_legs` rows. Derived payoff metrics and chart points are recalculated from the raw assumptions by the recorded engine version on every read rather than persisted.
- **Journal handoff:** “Continue in Journal” preloads symbol, direction, strategy, maximum loss, entry capital, and fees from the server-recalculated snapshot. `create_manual_trade_from_option_illustration` atomically creates the journal plan and `trade_option_illustration_sources` provenance link.
- **Security boundary:** All three tables use owner RLS and explicit grants. Normal authenticated access has `SELECT` and `INSERT` only, with no `UPDATE` or `DELETE`. Both RPCs are `SECURITY INVOKER` and restricted to authenticated and service roles.
- **Product boundary:** A saved snapshot is a manual deterministic strategy illustration, not a live quote, forecast, probability, confidence score, suitability determination, recommendation, staged order, or broker submission.
- **Supersedes:** D-023’s ephemeral-persistence statement and the individual-illustration portion of D-024’s persistence statement. The comparison set itself remains in browser memory only.

### D-029 — Strategy illustrations retain current candidate provenance

- **Date:** 2026-07-28
- **Status:** Accepted
- **Decision:** An active Watchlist item or exact current Reviews candidate may open Strategy Lab with a prefilled, source-locked symbol and direction-appropriate starting structure. The owner remains responsible for all contract, quote, expiration, sizing, and fee inputs.
- **Persistence boundary:** An explicit save atomically inserts the D-028 raw illustration and one immutable `option_illustration_sources` row containing its exact import batch, direction, ticker, physical row, optional Watchlist item, and optional exact D-026 evidence assessment.
- **Validation boundary:** Query parameters and hidden form values are untrusted source requests. The server resolves them against the authenticated owner, `save_sourced_option_illustration` independently verifies that the Watchlist source is active or the Reviews candidate is still current, and the insert RLS policy rejects fabricated source combinations even through a custom Data API call.
- **Journal continuity:** The existing journal source link now yields a chain from trade to illustration to originating candidate without copying mutable current-list state into the trade.
- **Product language:** Scanner direction and Setup Alignment provide traceable workflow context. Neither is confidence, probability, expected return, suitability, or an investment recommendation.

### D-030 — Scanner ranking and Schwab enrichment are the active product core

- **Date:** 2026-07-29
- **Status:** Accepted
- **Product focus:** The active build sequence prioritizes current Thinkorswim scanner import, read-only Schwab market-data enrichment, deterministic guideline evaluation, and transparent bullish/bearish ranking. Journal analytics, additional strategy structures, AI news, backtesting UI, and account-level risk controls are not expanded during this sequence.
- **Provider boundary:** Tradier-specific configuration, health routes, code, tests, and documentation are removed. Schwab data must enter through a provider-independent `ScannerMarketObservation` contract, while credentials and tokens remain server-only.
- **No guessed integration:** The repository records the required normalized fields but does not guess Schwab endpoints, OAuth behavior, token storage, response fields, or rate limits before approved credentials and current official contracts are available.
- **Ranking boundary:** Overview charts only complete, current Setup Alignment observations. Missing, stale, failed, or not-yet-enriched candidates remain visible in an explicitly unranked group. Workbook position and placeholder values are never presented as analysis rank.
- **Language boundary:** “Top” means highest deterministic Setup Alignment under the displayed version and timestamp. It is not confidence, expected return, suitability, or an investment recommendation.

### D-031 — Active scanner state expires at the Chicago date boundary

- **Date:** 2026-07-29
- **Status:** Accepted
- **Date authority:** The trusted database boundary derives `trading_date` from `America/Chicago`; the browser cannot choose or spoof it. Calendar-day rollover is intentionally separate from a future exchange holiday calendar.
- **Read boundary:** Overview, Reviews, Evidence, and current Scans select only completed batches for today's Chicago date. A missing bullish or bearish import therefore produces an empty current section instead of falling back to yesterday.
- **Write boundary:** The first successful import on a new date removes stale physical rows from both current stock tables. Later imports on that date replace only their matching direction. Cleanup is part of the import transaction and occurs only after the new workbook has committed successfully.
- **Retention boundary:** Import and audit metadata remain. Deliberately saved `watchlists`/`watchlist_items`, append-only `trades`/`journal_entries`, and immutable `scan_runs`/`scan_results` are not deleted or archived by rollover.
- **Same-file behavior:** An owner may import the same direction and file hash again on a later date as a new current batch. Repeating it on the same date remains idempotent.

## Founder decisions required before MVP implementation

### Q-001 — What exact workflow is being replaced?

**Status:** Answered for canonical-file data scope and layout. `BullishList.xlsx` and `BearishList.xlsx` are the canonical manual inputs, and only column A is imported. Both inspected fixtures use `Watchlist Scanner` in row 1, `Results` in row 2, `Symbol` in row 3, and identifiers beginning in row 4. Multi-sheet approval is rejected until selection exists. Still needed: behavior for future layout variants and a source for import-level observation time and scanner metadata.

### Q-002 — What is the trading horizon?

**Status:** Open. This means: after a company appears in the scan, how long do you expect the idea to take to work—same day, next day, about one week, several weeks, or until a specific event? Indicator parameters, VWAP meaning, exits, and backtests depend on this.

### Q-003 — What is the universe?

Define equities/ETFs, exchanges, minimum price/liquidity, exclusions, and whether options availability is required.

### Q-004 — What makes a candidate bullish or bearish?

**Status:** Partially answered. The v1 High Conviction Bullish and Bearish requirements are recorded in `SCANNERS.md`. Exact Thinkorswim indicator parameters, threshold inclusivity, price basis, and session behavior still require confirmation.

### Q-005 — What should the initial score measure?

**Status:** Answered for the experimental manual bridge. Setup Alignment
`manual-high-conviction-v1.0.0` measures how many of the ten documented
High-Conviction v1 rules pass, at ten points each, with no renormalization for
missing inputs. It is rule matching rather than probability or historical
confidence. Weight validation and any production score change still require
point-in-time outcome evidence under D-025.

### Q-006 — What is a win?

**Status:** Partially answered. The founder defines a win as the scanner getting the direction right. Still required: right by when, by what minimum movement, measured from which price, and whether success refers to the underlying direction or actual option profitability. Until resolved, record 1-, 5-, 10-, and 20-trading-day forward returns rather than forcing one win label.

### Q-007 — What does “cloud” mean?

Specify Ichimoku or another indicator, including parameters and timeframe.

### Q-008 — How are support and resistance calculated?

Choose an algorithm and validation method. These cannot remain discretionary chart drawings if the system is deterministic.

### Q-009 — Which market-data rights are available?

Confirm Thinkorswim export use and later vendor entitlements, storage duration, derived-data rights, and whether the product will remain personal.

### Q-010 — Personal tool or future commercial product?

**Status:** Resolved. Personal, single-user tool. See D-008.

### Q-011 — What account/risk constraints matter?

Define maximum risk per illustration, permitted structures, contract multiplier handling, buying-power assumptions, and commission model.

### Q-012 — What may be sent to OpenAI?

Approve data categories, retention expectations, redaction, and whether journal notes are opt-in.

## Decision template

```text
### D-NNN — Title
- Date:
- Owner:
- Status: Proposed | Accepted | Superseded | Rejected
- Context:
- Decision:
- Alternatives:
- Rationale:
- Consequences:
- Supersedes:
```
