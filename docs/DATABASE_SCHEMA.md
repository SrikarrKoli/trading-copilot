# Database Schema

## Principles

- Use UUID primary keys and UTC `timestamptz`; retain source timezone metadata.
- User-owned tables include `user_id` and RLS.
- Raw inputs and derived results are linked, versioned, and auditable.
- Use numeric/decimal for money and contract values; avoid binary floating point for persisted monetary results.
- Prefer append-only history for calculated artifacts. Imported ticker lists
  are current-state data; retain only batch and audit metadata after replacement.

## Core tables

### Identity and imports

| Table | Purpose | Key fields |
|---|---|---|
| `profiles` | User preferences | `id -> auth.users`, timezone, created_at |
| `import_batches` | Raw workbook identity and processing lifecycle | owner_id, original_filename, file_sha256, size, source_type, market_data_timestamp, status, counters |
| `bullish_stocks` | Current bullish workbook rows only | import_batch_id, owner_id, source sheet/row, ticker, raw/normalized JSON, validation status |
| `bearish_stocks` | Current bearish workbook rows only | import_batch_id, owner_id, source sheet/row, ticker, raw/normalized JSON, validation status |
| `import_audit_history` | Append-only import event history | import_batch_id, owner_id, event_type, previous/new status, event_timestamp, safe_metadata |
| `symbols` | Stable instrument identity | ticker, asset_type, exchange, effective dates |

Unique constraints:

- `(owner_id, file_sha256)` on `import_batches` identifies a duplicate file for one owner.
- `(import_batch_id, source_sheet_name, original_row_number)` on each current
  stock table identifies one physical workbook row.

Ticker and direction are values contained in a physical row, not part of its identity.

### Definitions and scans

| Table | Purpose | Key fields |
|---|---|---|
| `scanner_definitions` | Immutable scanner versions | scanner_key, version, rules_json, required_fields_json, status |
| `score_definitions` | Immutable score versions | score_key, version, components_json, max_points |
| `scan_runs` | One execution manifest | user_id, import_file_id, scanner_definition_id, score_definition_id, data_as_of, code_version, status |
| `scan_results` | Per-symbol output | scan_run_id, symbol_id, included, direction, rank, alignment_score, completeness |
| `score_contributions` | Transparent component ledger | scan_result_id, component_key, raw_value_json, available_points, earned_points, rule_result |
| `review_actions` | Save/dismiss/defer history | user_id, scan_result_id, action, reason_code, note, created_at |

Do not overwrite `scan_results` when a definition changes.

The current import-first slice stores `review_actions` against
`(owner_id, import_batch_id, direction, ticker_symbol)` until versioned
`scan_results` exist. Actions are append-only; the latest action is the current
review state, and older actions remain available for audit. The source row is
revalidated server-side before insertion. A future migration may add
`scan_result_id` without discarding this import provenance.

The applied manual evidence slice uses
`manual_evidence_assessments` as an append-only owner ledger. Every row links to
the exact import batch, direction, ticker, and source row and stores:

- score version, observation timestamp, and source label;
- all ten raw manual inputs;
- a stored generated `setup_alignment` value derived from those inputs; and
- immutable save time.

The server revalidates that the candidate still exists in the referenced
current-state table before insertion. Evidence and Reviews select the latest
row by `(saved_at, id)` for each current candidate, while older rows remain
available for audit. Authenticated owners receive `SELECT` and `INSERT` only,
and RLS scopes both policies to `auth.uid()`.

The current watchlist slice likewise uses import provenance until versioned
scan results exist:

- `watchlists` stores an owner-named, typed collection and is soft archived.
- `watchlist_items` stores one active membership per list and ticker. Archiving
  removes the symbol from the active UI without erasing its history.
- `watchlist_item_sources` stores every distinct import/direction/source-row
  occurrence that contributed to an active membership.

`assign_candidate_to_watchlist` is an authenticated `SECURITY INVOKER`
transaction. It revalidates both the current imported candidate and the active
owner watchlist, reuses an existing active membership when present, adds the
source occurrence idempotently, and appends the matching `watchlisted`
`review_actions` row. A partial unique index prevents duplicate active
memberships while allowing a previously archived ticker to be added again.

### Watchlists and analysis

| Table | Purpose | Key fields |
|---|---|---|
| `watchlists` | User-defined collections | user_id, name, direction, archived_at |
| `watchlist_items` | Membership history | watchlist_id, symbol_id, source_scan_result_id, thesis, added_at, archived_at |
| `watchlist_item_sources` | All scanner matches behind a combined item | watchlist_item_id, scan_result_id, scanner_definition_id |
| `scanner_settings` | Versioned user thresholds and event windows | user_id, scanner_key, version, settings_json, effective_at |
| `alert_rules` | User-configured scanner alerts | user_id, scanner_key, channel, conditions_json, enabled |
| `alert_events` | Deduplicated alert history | alert_rule_id, scan_result_id, observed_at, status, deduplication_key |
| `indicator_values` | Versioned deterministic features | symbol_id, timeframe, observed_at, indicator_definition_id, value_json, source_observation_ids |
| `analyses` | Deterministic/AI analysis manifest | user_id, symbol_id, data_as_of, type, evidence_packet_hash, status |
| `analysis_claims` | Structured claims and provenance | analysis_id, category, text, fact_ids, risk_level |
| `ai_generations` | AI audit metadata | analysis_id, provider, model, prompt_version, schema_version, validation_status |

### Options

| Table | Purpose | Key fields |
|---|---|---|
| `option_contracts` | Contract identity | underlying_symbol_id, OCC symbol, expiry, strike, option_type, multiplier |
| `option_quotes` | Timestamped quote | contract_id, quoted_at, bid, ask, last, volume, open_interest, source |
| `option_illustrations` | Applied immutable manual calculation assumptions | owner_id, strategy, ticker, spot, expiry, quote_time, pricing_mode, fees, engine_version |
| `option_illustration_legs` | Applied ordered raw manual legs | illustration_id, owner_id, leg_order, side, option_type, strike, bid, ask, manual_fill, quantity, multiplier |
| `strategy_metrics` | Calculated outputs | illustration_id, max_gain, max_loss, break_evens_json, expected_move, risk_reward_json, iv_context_json, greeks_json |

The current manual slice does not persist `strategy_metrics`. It reruns the
versioned deterministic engine from `option_illustrations` and
`option_illustration_legs` on every read. Future sourced quote/model outputs may
add versioned metric rows without rewriting these raw assumption snapshots.

### Journal and backtests

| Table | Purpose | Key fields |
|---|---|---|
| `trades` | User trade record | user_id, symbol_id, strategy_type, thesis, source_scan_result_id, entry, exit, pnl, status |
| `trade_option_illustration_sources` | Immutable Strategy Lab provenance | trade_id, option_illustration_id, owner_id, linked_at |
| `trade_legs` | Actual contracts/fills | trade_id, contract_id, side, quantity |
| `trade_fills` | Entry/exit executions | trade_leg_id, executed_at, price, quantity, fees |
| `journal_entries` | Append-only reflections | trade_id, entry_type, body, reasons_wrong_json, mistakes_json, lessons_json, tags_json, created_at |
| `backtest_definitions` | Versioned test specification | user_id, hypothesis, parameters_json, code_version |
| `backtest_runs` | Reproducibility manifest | definition_id, dataset_hash, window, status, started_at, completed_at |
| `backtest_trades` | Simulated trade ledger | run_id, symbol_id, signal_at, entry_at, exit_at, returns/cost fields |
| `backtest_metrics` | Named results | run_id, metric_key, value, denominator, interval_json |
| `learning_insights` | Candidate personal patterns | user_id, definition_version, cohort_json, sample_size, result_json, status |

### Applied manual journal boundary

The current journal slice intentionally uses two tables:

- `trades` stores immutable owner, ticker, optional source watchlist item, and
  creation time.
- `journal_entries` stores a complete append-only snapshot for every initial
  plan, plan revision, status change, and reflection.

The latest journal entry by `(created_at, id)` is the current trade state. Every
snapshot retains direction, strategy, thesis, plan, required **Reasons I’m
Wrong**, intended risk, signed manual entry/exit values, fees, manual realized
P/L, note, mistakes, lessons, tags, and status. This duplication is deliberate:
an earlier plan or value remains reconstructable after a correction.

Authenticated owners can only `SELECT` and `INSERT`; they receive no table
`UPDATE` or `DELETE` privilege. RLS scopes both tables to `auth.uid()`.
`create_manual_trade` atomically creates the immutable identity and initial
snapshot. `append_manual_trade_event` validates allowed status transitions and
appends later snapshots. Both functions are `SECURITY INVOKER`, validate the
authenticated owner, and expose execute permission only to authenticated and
service roles.

`create_manual_trade_from_option_illustration` composes the existing atomic
trade creation function with an immutable source-link insert in the same
transaction. The Next.js action reloads and recalculates the owner-scoped
illustration before deriving its symbol, direction, strategy, intended risk,
entry capital, and fees. Journal thesis, plan, and counter-evidence remain
required owner input.

Entry and exit net values use a manual signed convention: positive means debit
paid and negative means credit received. Realized P/L is user-entered rather
than calculated or broker-reconciled. Journal text is not sent to AI.

## Audit and deletion

Use `created_at`, `created_by`, and immutable version references. User-authored notes may have revision history. Soft deletion is suitable for watchlist workflow; privacy deletion must ultimately remove or irreversibly anonymize user data according to a defined policy.

## RLS baseline

Every user-owned table uses an ownership policy. Child tables enforce access through their parent relationship or carry `user_id` for simpler and faster policies. Create indexes on policy predicates and foreign keys. Service-role access is limited to server jobs.

The applied import schema carries `owner_id` on all three import tables and uses
composite foreign keys to ensure child ownership matches the parent batch.
Ownership is the permanent `auth.users.id` UUID. Email addresses are never
database ownership keys.

RLS is enabled on `import_batches`, `bullish_stocks`, `bearish_stocks`, and
`import_audit_history`. The `authenticated` Data API role receives explicit
`SELECT` grants and owner-scoped policies. The `anon` role receives no table
privileges. Browser writes are intentionally not granted. The authenticated
Next.js route forwards the verified access token to the `commit-import` Edge
Function. That server-only function verifies the user again, derives
`owner_id` from the token, and invokes the service-only `commit_import`
transaction. No service-role or secret key is present in browser code or the
Next.js runtime.

UPDATE policies on the batch and row tables include both `USING` and
`WITH CHECK` ownership predicates as defense in depth. The current
`authenticated` browser role still has no UPDATE grant. Audit history has no
browser INSERT, UPDATE, or DELETE policy or grant.

## Applied import schema

Migration `create_import_schema` creates the three import tables, constraints,
indexes, grants, and RLS policies. Migration `add_import_fk_indexes` adds
covering indexes for the composite child-to-batch foreign keys identified by
the Supabase Performance Advisor. Migration `commit_import_transaction` adds
the service-only atomic import RPC. Migration
`remove_auth_schema_read_from_commit_import` keeps that RPC as
`SECURITY INVOKER` while relying on the verified Edge identity and the batch
owner foreign key instead of widening access to `auth.users`. Migration
`split_current_bullish_bearish_stocks` creates the two current-state tables,
migrates the 17 current bullish and 6 current bearish rows, removes
`imported_stock_rows`, and changes the transaction to replace one direction at
a time. The following migrations allow the `superseded` audit status and add
covering foreign-key indexes.

### Duplicate semantics

- **Duplicate active file:** the same owner UUID, direction, and SHA-256 hash
  as the current completed list. The transaction returns that current batch
  without replacing rows.
- **Duplicate physical row:** the same batch, source sheet, and original row
  number in the applicable current-state table. The unique constraint rejects
  a second record for that physical location.
- **Duplicate ticker occurrence:** the same normalized ticker appears on
  multiple physical rows in the current workbook. Every occurrence remains
  traceable until that direction is replaced. Later occurrences may use
  `validation_status = 'duplicate'` and `duplicate_of_row_id` to point to an
  earlier row in the same batch.

`duplicate_rows` counts preserved ticker occurrences classified as duplicate.
A rejected second insert for an already-stored physical row does not create a
row and is not included in that counter.

Superseded file hashes remain in batch metadata. Re-importing a hash from an
older superseded batch creates a fresh active batch because its ticker rows no
longer exist.

### Batch counter reconciliation

The batch constraint enforces:

`total_rows = valid_rows + invalid_rows + duplicate_rows`

This CHECK compares stored batch columns only. It does not count either current
stock table. The `commit_import` transaction separately aggregates the inserted
rows in the applicable table, verifies that the aggregate equals the submitted
row count, writes those aggregate values to the batch, and commits only when
both reconciliations agree. Blank source rows are omitted by the parser, so
`total_rows` counts persisted nonblank source rows rather than the worksheet's
full used range.

### Audit write boundary

The normal browser client can read only audit records owned by its authenticated
UUID. It cannot insert arbitrary audit events. The trusted import boundary:

1. Verify the Supabase access token and configured permanent owner.
2. Derive `owner_id` from the verified token subject.
3. Write the batch, rows, reconciled counters, and audit events in one database
   transaction.
4. Keep any privileged credential server-only.

Audit metadata is restricted by convention to allowlisted operational values.
It must not contain secrets, credentials, session tokens, raw email content, or
unnecessary personal data.

### Transaction and retry behavior

The browser performs no database write during preview. Explicit approval sends
the original workbook to a Next.js Route Handler, which authenticates the
cookie-backed Supabase session and parses the original bytes again. The Edge
Function repeats JWT verification and calls `commit_import`.

For the selected direction, deletion of current rows happens before insertion
inside one PostgreSQL subtransaction. Row insertion, counter reconciliation,
completion status, superseding the prior batch, and audit events commit
together. A row error rolls the subtransaction back—including the deletion—so
the previous usable list is restored. The failed attempt receives a safe error
code and audit event. Retrying the same direction/hash reuses that failed,
empty batch. The opposite-direction table is never modified.

The current parser has no market observation timestamp in the workbook
contract, so both batch and row observation timestamps are stored as `NULL`.
Multi-sheet workbooks are previewable but cannot be approved until worksheet
selection is implemented, preventing an ambiguous commit.

### Advisor verification

After the import transaction migration, the Supabase Performance Advisor
reported only expected `unused_index` informational notices for new import
indexes. They are retained because they support duplicate links and future
owner/ticker observation queries.

The Security Advisor reported no table, RLS, function, or grant finding for the
import boundary. Its remaining project-level warning is that Auth leaked
password protection is disabled; that hosted Auth setting must be enabled
separately in the Supabase dashboard when supported by the project plan.

Migrations `create_watchlists` and `add_watchlist_fk_indexes` add the three
owner-scoped watchlist tables, explicit authenticated grants, RLS policies,
atomic assignment function, and covering composite foreign-key indexes.
Advisor verification after both migrations reported no missing RLS, function,
grant, or foreign-key-index finding. New watchlist indexes report only expected
`unused_index` informational notices while the tables are empty.

Migration `create_manual_trade_journal` adds the immutable trade identities,
append-only snapshot ledger, RLS policies, explicit Data API grants, and atomic
invoker functions. Post-migration advisors reported no journal-specific
security or missing-index finding; only expected `unused_index` informational
notices appear while the journal is empty.

Migration `create_evidence_assessments` adds the append-only
`manual_evidence_assessments` ledger, composite import provenance, stored
generated Setup Alignment, RLS policies, explicit Data API grants, and indexes
for current-candidate latest reads. Rollback-only verification confirmed a
complete fixture generated `100`, owner RLS is enabled, authenticated users
have `SELECT`/`INSERT` but not `UPDATE`/`DELETE`, and no test row remained.

### Applied saved-scan boundary

Migration `create_saved_scan_snapshots` adds three immutable owner-scoped
tables:

- `scanner_definitions` stores a stable scanner key plus semantic version,
  display name, direction, market, timeframe, session scope, descriptive rule
  summary, and change note. The current constraint permits only
  `experimental`; `rules_json` remains null until exact executable criteria are
  captured.
- `scan_runs` links a user-named immutable snapshot to one definition version
  and the exact completed import batch.
- `scan_results` copies one row per distinct ticker so the snapshot survives
  normal current-list replacement. It retains candidate order, first source
  row, source sheet, occurrence count, and available observation time.

`candidate_order` preserves the earliest physical workbook order. It is not a
score, confidence, recommendation rank, or evidence that this application ran
the scanner. `source_occurrence_count` records deduplication without duplicating
the saved symbol.

`create_scanner_definition_version` serializes version allocation per
owner/stable key and creates patch, minor, or major versions. The first version
is `1.0.0`. `save_current_import_scan` verifies ownership, a completed batch,
direction compatibility, and the continued presence of that batch in the
applicable current-state table before inserting the run and results in one
transaction. This prevents saving a batch after a replacement removed its
current rows.

Authenticated owners receive only `SELECT` and `INSERT` table grants; no normal
`UPDATE` or `DELETE` grant exists. All three tables use owner RLS, composite
owner foreign keys, and explicit authenticated grants. Both functions are
`SECURITY INVOKER` and are executable only by authenticated and service roles.

The migration passed a clean local rebuild and lint. A rollback-only behavior
test created versions `1.0.0` and `1.0.1`, saved a three-row fixture as two
ordered results, preserved the duplicate occurrence count, and then removed
the fixture. Hosted verification found all six RLS policies and both functions.
The advisor reported no saved-scan security or missing-index finding; new
indexes have only expected `unused_index` informational notices while these
tables are empty.

### Applied option-illustration persistence boundary

Migrations `save_option_illustrations`,
`add_option_illustration_fk_indexes`, and `lock_option_engine_version` add the
immutable raw assumption tables, their owner RLS and explicit grants, the
journal provenance table, the atomic save and journal-handoff functions, and a
database constraint that accepts only supported engine `1.0.0` snapshots.

A hosted rollback-only fixture saved one long-call snapshot, its ordered leg,
an initial journal plan, and the exact source link in one authenticated flow.
All four records were visible inside the transaction and no fixture row
remained after rollback. Authenticated users have `SELECT` and `INSERT` but no
`UPDATE` or `DELETE`. The Security Advisor reported no option-table, RLS,
function, or grant finding. The Performance Advisor reported no missing
foreign-key index after the covering-index migration; newly empty indexes have
only expected `unused_index` informational notices.

## Import schema boundary

`BullishList.xlsx` and `BearishList.xlsx` contribute only the stock identifier from column A. Do not add columns from the workbooks to `market_observations`. Indicators, quotes, news, earnings, option data, and scanner provenance come from separate user input or later data-source adapters.
