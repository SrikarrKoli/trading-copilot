# Input Files

## Phase 1 source

Phase 1 uses Excel workbooks that Sagar manually provides after running scanners in his Thinkorswim account. Trading Copilot does not connect to Thinkorswim or initiate scanner runs.

The canonical example files are:

| Example file | Declared direction | Purpose |
|---|---|---|
| `BullishList.xlsx` | Bullish | Results exported after running the bullish Thinkorswim scanners |
| `BearishList.xlsx` | Bearish | Results exported after running the bearish Thinkorswim scanners |

These are fixtures for defining and testing the importer. The application must not depend on these exact filenames.

## Import contract

- Accept `.xlsx` through an explicit manual upload.
- Require the user to select or confirm bullish/bearish direction during import; a filename is only a hint.
- Preserve the original workbook, filename, byte size, SHA-256 hash, import time, and user-declared direction.
- Read only column A from the selected worksheet.
- Recognize the canonical Thinkorswim export preamble in column A: `Watchlist Scanner` in row 1, `Results` in row 2, and the `Symbol` header in row 3.
- For that detected layout, treat nonblank column-A cells beginning at row 4 as stock identifiers (ticker/symbol); do not import the preamble or header as identifiers.
- Ignore every other column. Other columns are not parsed, validated, or stored as market observations.
- Detect and record the worksheet, layout/schema, preamble and header rows, source row number, raw column-A value, normalized stock identifier, and row counts.
- Preview parsed rows and all validation issues before committing.
- Import the displayed value from column A only; never execute macros, external links, formulas, or embedded content.
- Record the source as `thinkorswim_manual_export`.
- Keep workbook upload time separate from the market-data observation time.
- Make repeated imports of the same workbook content idempotent for the user.

## Column A rules

- Trim leading and trailing whitespace.
- Normalize ticker symbols to uppercase for matching while preserving the original cell value for audit.
- Ignore blank cells but report their count in the import preview.
- Detect the full canonical three-row preamble before skipping rows 1–3. Do not skip those rows merely because one cell resembles a known label.
- For noncanonical files, detect common headers such as `Symbol`, `Ticker`, or `Stock`; do not automatically discard the first row, and require confirmation in the preview when the header or data-start row is ambiguous.
- Preserve duplicate source rows for audit, but create one candidate per normalized symbol within an import and report duplicate row numbers.
- Reject cells that do not produce a usable stock identifier after trimming.
- Do not interpret numbers, dates, prices, percentages, formulas, or formatting from other columns.

## Observed canonical layout

The canonical files were inspected on 2026-07-26. Both contain one worksheet named `Sheet1` and use the same column-A layout:

| Row | Bullish file | Bearish file | Import meaning |
|---:|---|---|---|
| 1 | `Watchlist Scanner` | `Watchlist Scanner` | Preamble; do not import |
| 2 | `Results` | `Results` | Preamble; do not import |
| 3 | `Symbol` | `Symbol` | Header; do not import |
| 4 onward | Stock identifiers | Stock identifiers | Data rows |

At inspection time, `BullishList.xlsx` had 17 identifiers in rows 4–20 and `BearishList.xlsx` had 6 identifiers in rows 4–9. These counts and values are fixture observations, not hard-coded acceptance requirements.

## Direction and scanner provenance

The workbook-level direction does not prove expected market movement. It means only that the rows came from the user's bullish or bearish scanner workflow.

Because only column A is used, scanner provenance cannot be read from another workbook column. The import flow must require the user to select the contributing scanner or label the run as an aggregated bullish/bearish export. Do not infer a scanner from ticker values or row order.

## Schema status

The Phase 1 data schema is intentionally narrow: column A supplies only the stock identifier. These workbooks do not supply indicator inputs, option-chain data, news, earnings, scanner identity, or a reliable market observation time.

Additional fixtures should include an unchanged repeat export, an empty scan, a headerless file, blank cells, duplicate symbols, mixed-case symbols, whitespace, invalid identifiers, multiple worksheets, and an unsupported workbook layout.
