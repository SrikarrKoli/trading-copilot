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
- **Consequence:** The owner signs in with email and password. Cookie-backed access and refresh tokens retain the session. If cookies are cleared, signing in again with the same Auth account restores access under the same UUID. Email links are reserved for password recovery.
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

Approve components and state the intended interpretation in one sentence. Do not set weights until the current workflow and historical data are reviewed.

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
