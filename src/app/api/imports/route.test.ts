import { existsSync, readFileSync } from "node:fs";

import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

import type { ImportBoundaryResult } from "@/lib/import/commit-types";
import { createImportPostHandler } from "@/app/api/imports/route";

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

function importRequest(bytes: Uint8Array, fileName = "BullishList.xlsx") {
  const formData = new FormData();
  formData.set(
    "file",
    new File([Uint8Array.from(bytes)], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  formData.set("direction", "bullish");

  return new Request("http://localhost/api/imports", {
    method: "POST",
    body: formData,
  });
}

const authenticatedOwner = {
  accessToken: "test-access-token",
  ownerId: "2d3ed39f-52f6-40df-8b65-820283a25e08",
};

describe("POST /api/imports", () => {
  it("revalidates and commits a workbook after explicit approval", async () => {
    const commitResult: ImportBoundaryResult = {
      ok: true,
      duplicate_file: false,
      batch_id: "11111111-1111-4111-8111-111111111111",
      processing_status: "completed",
      total_rows: 3,
      valid_rows: 1,
      invalid_rows: 1,
      duplicate_rows: 1,
    };
    const commit = vi.fn().mockResolvedValue(commitResult);
    const handler = createImportPostHandler({
      authenticate: vi.fn().mockResolvedValue(authenticatedOwner),
      commit,
    });

    const response = await handler(
      importRequest(
        createWorkbook(["Symbol", "AAPL", " aapl ", "NOT A SYMBOL"]),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      duplicateFile: false,
      batchId: commitResult.batch_id,
      counts: {
        totalRows: 3,
        validRows: 1,
        invalidRows: 1,
        duplicateRows: 1,
      },
    });
    expect(commit).toHaveBeenCalledOnce();
    expect(commit.mock.calls[0][0]).toMatchObject({
      original_filename: "BullishList.xlsx",
      file_size_bytes: expect.any(Number),
      file_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      rows: [
        expect.objectContaining({
          original_row_number: 2,
          ticker_symbol: "AAPL",
          direction: "bullish",
          validation_status: "valid",
        }),
        expect.objectContaining({
          original_row_number: 3,
          duplicate_of_row_number: 2,
          validation_status: "duplicate",
        }),
        expect.objectContaining({
          original_row_number: 4,
          ticker_symbol: null,
          validation_status: "invalid",
        }),
      ],
    });
    expect(commit.mock.calls[0][1]).toBe("test-access-token");
  });

  it("returns the existing batch for a duplicate workbook", async () => {
    const commit = vi.fn().mockResolvedValue({
      ok: true,
      duplicate_file: true,
      batch_id: "22222222-2222-4222-8222-222222222222",
      processing_status: "completed",
      total_rows: 1,
      valid_rows: 1,
      invalid_rows: 0,
      duplicate_rows: 0,
    });
    const handler = createImportPostHandler({
      authenticate: vi.fn().mockResolvedValue(authenticatedOwner),
      commit,
    });

    const response = await handler(
      importRequest(createWorkbook(["Symbol", "MSFT"])),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      duplicateFile: true,
      batchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(body.message).toContain("already imported");
  });

  it("does not report success for an existing non-completed batch", async () => {
    const handler = createImportPostHandler({
      authenticate: vi.fn().mockResolvedValue(authenticatedOwner),
      commit: vi.fn().mockResolvedValue({
        ok: true,
        duplicate_file: true,
        batch_id: "44444444-4444-4444-8444-444444444444",
        processing_status: "processing",
      }),
    });

    const response = await handler(
      importRequest(createWorkbook(["Symbol", "AAPL"])),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error).toContain("not completed");
  });

  it("rejects invalid input without calling the commit boundary", async () => {
    const commit = vi.fn();
    const handler = createImportPostHandler({
      authenticate: vi.fn().mockResolvedValue(authenticatedOwner),
      commit,
    });

    const response = await handler(
      importRequest(new TextEncoder().encode("not an xlsx workbook")),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("denies anonymous approval before parsing or writing", async () => {
    const commit = vi.fn();
    const handler = createImportPostHandler({
      authenticate: vi.fn().mockResolvedValue(null),
      commit,
    });

    const response = await handler(
      importRequest(createWorkbook(["Symbol", "AAPL"])),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: "Sign in to approve this import.",
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it.runIf(existsSync("C:\\TradingDocs\\BullishList.xlsx"))(
    "prepares the real bullish workbook through the approval boundary",
    async () => {
      const commit = vi.fn().mockResolvedValue({
        ok: true,
        duplicate_file: false,
        batch_id: "33333333-3333-4333-8333-333333333333",
        processing_status: "completed",
        total_rows: 17,
        valid_rows: 17,
        invalid_rows: 0,
        duplicate_rows: 0,
      });
      const handler = createImportPostHandler({
        authenticate: vi.fn().mockResolvedValue(authenticatedOwner),
        commit,
      });

      const response = await handler(
        importRequest(readFileSync("C:\\TradingDocs\\BullishList.xlsx")),
      );

      expect(response.status).toBe(200);
      expect(commit.mock.calls[0][0].rows).toHaveLength(17);
      expect(commit.mock.calls[0][0].rows[0]).toMatchObject({
        source_sheet_name: "Sheet1",
        original_row_number: 4,
        direction: "bullish",
      });
    },
  );
});
