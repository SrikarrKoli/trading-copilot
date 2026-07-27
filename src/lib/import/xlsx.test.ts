import { existsSync, readFileSync } from "node:fs";

import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { parseXlsxBytes } from "@/lib/import/xlsx";

function createWorkbook(columnA: string[]): Uint8Array {
  const sharedStrings = columnA
    .map((value) => `<si><t>${value}</t></si>`)
    .join("");
  const cells = columnA
    .map(
      (_, index) =>
        `<row r="${index + 1}"><c r="A${index + 1}" t="s"><v>${index}</v></c></row>`,
    )
    .join("");

  return zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>',
    ),
    "xl/sharedStrings.xml": strToU8(
      `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${columnA.length}" uniqueCount="${columnA.length}">${sharedStrings}</sst>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:A${columnA.length}"/><sheetData>${cells}</sheetData></worksheet>`,
    ),
  });
}

describe("parseXlsxBytes", () => {
  it("detects the canonical Thinkorswim preamble and starts data at row 4", async () => {
    const preview = await parseXlsxBytes(
      createWorkbook([
        "Watchlist Scanner",
        "Results",
        "Symbol",
        "AAPL",
        "msft",
      ]),
      "BullishList.xlsx",
    );

    expect(preview.layout).toBe("thinkorswim_watchlist");
    expect(preview.headerRow).toBe(3);
    expect(preview.dataStartRow).toBe(4);
    expect(preview.candidateCount).toBe(2);
    expect(preview.rows[1].normalizedSymbol).toBe("MSFT");
  });

  it("preserves duplicate rows while creating one candidate per symbol", async () => {
    const preview = await parseXlsxBytes(
      createWorkbook(["Symbol", "AAPL", " aapl ", "NOT A SYMBOL"]),
      "duplicates.xlsx",
    );

    expect(preview.layout).toBe("generic_header");
    expect(preview.candidateCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows[1]).toMatchObject({
      status: "duplicate",
      duplicateOfRow: 2,
    });
  });

  it("keeps the first row as data when no supported header is detected", async () => {
    const preview = await parseXlsxBytes(
      createWorkbook(["AAPL", "MSFT"]),
      "headerless.xlsx",
    );

    expect(preview.layout).toBe("headerless");
    expect(preview.dataStartRow).toBe(1);
    expect(preview.candidateCount).toBe(2);
    expect(preview.issues[0].severity).toBe("warning");
  });
});

const bullishFixture = "C:\\TradingDocs\\BullishList.xlsx";
const bearishFixture = "C:\\TradingDocs\\BearishList.xlsx";

describe.runIf(existsSync(bullishFixture) && existsSync(bearishFixture))(
  "canonical local fixtures",
  () => {
    it("matches the observed BullishList and BearishList contracts", async () => {
      const bullish = await parseXlsxBytes(
        readFileSync(bullishFixture),
        "BullishList.xlsx",
      );
      const bearish = await parseXlsxBytes(
        readFileSync(bearishFixture),
        "BearishList.xlsx",
      );

      expect(bullish).toMatchObject({
        worksheet: "Sheet1",
        layout: "thinkorswim_watchlist",
        dataStartRow: 4,
        candidateCount: 17,
        invalidCount: 0,
      });
      expect(bearish).toMatchObject({
        worksheet: "Sheet1",
        layout: "thinkorswim_watchlist",
        dataStartRow: 4,
        candidateCount: 6,
        invalidCount: 0,
      });
    });
  },
);
