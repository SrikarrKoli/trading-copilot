import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";

import type {
  ImportIssue,
  ImportRow,
  WorkbookPreview,
} from "@/lib/import/types";

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const COMMON_HEADERS = new Set(["symbol", "ticker", "stock"]);
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9]{0,9}(?:[.-][A-Z0-9]{1,3})?$/;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: false,
});

type XmlNode = Record<string, unknown>;

interface CellValue {
  rowNumber: number;
  value: string;
  formula: boolean;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function asNode(value: unknown): XmlNode {
  return value && typeof value === "object" ? (value as XmlNode) : {};
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  const node = asNode(value);
  return stringValue(node["#text"]);
}

function richTextValue(nodeValue: unknown): string {
  const node = asNode(nodeValue);
  if (node.t !== undefined) return stringValue(node.t);
  return asArray(node.r)
    .map((run) => stringValue(asNode(run).t))
    .join("");
}

function decodeXml(files: Record<string, Uint8Array>, path: string): XmlNode {
  const bytes = files[path];
  if (!bytes) throw new Error(`Workbook part is missing: ${path}`);
  return asNode(xmlParser.parse(strFromU8(bytes)));
}

function normalizePartPath(target: string): string {
  const normalized = target.replaceAll("\\", "/").replace(/^\/+/, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

function getSharedStrings(files: Record<string, Uint8Array>): string[] {
  if (!files["xl/sharedStrings.xml"]) return [];
  const document = decodeXml(files, "xl/sharedStrings.xml");
  const sst = asNode(document.sst);
  return asArray(sst.si).map(richTextValue);
}

function readColumnA(
  sheet: XmlNode,
  sharedStrings: string[],
): { cells: CellValue[]; maxRow: number } {
  const worksheet = asNode(sheet.worksheet);
  const sheetData = asNode(worksheet.sheetData);
  const cells: CellValue[] = [];
  let maxRow = 0;

  for (const rowValue of asArray(sheetData.row)) {
    const row = asNode(rowValue);
    const rowNumber = Number(row["@_r"] ?? 0);
    if (Number.isFinite(rowNumber)) maxRow = Math.max(maxRow, rowNumber);

    for (const cellValue of asArray(row.c)) {
      const cell = asNode(cellValue);
      const reference = stringValue(cell["@_r"]);
      if (!/^A\d+$/i.test(reference)) continue;

      const currentRow = Number(reference.slice(1));
      const type = stringValue(cell["@_t"]);
      let value = "";

      if (type === "s") {
        value = sharedStrings[Number(stringValue(cell.v))] ?? "";
      } else if (type === "inlineStr") {
        value = richTextValue(cell.is);
      } else if (type === "b") {
        value = stringValue(cell.v) === "1" ? "TRUE" : "FALSE";
      } else {
        value = stringValue(cell.v);
      }

      cells.push({
        rowNumber: currentRow,
        value,
        formula: cell.f !== undefined,
      });
      maxRow = Math.max(maxRow, currentRow);
    }
  }

  const dimension = stringValue(asNode(worksheet.dimension)["@_ref"]);
  const dimensionMatch = dimension.match(/:[A-Z]+(\d+)$/i);
  if (dimensionMatch) maxRow = Math.max(maxRow, Number(dimensionMatch[1]));

  return { cells, maxRow };
}

function detectLayout(cells: CellValue[]) {
  const byRow = new Map(
    cells.map((cell) => [cell.rowNumber, cell.value.trim().toLowerCase()]),
  );

  if (
    byRow.get(1) === "watchlist scanner" &&
    byRow.get(2) === "results" &&
    byRow.get(3) === "symbol"
  ) {
    return {
      layout: "thinkorswim_watchlist" as const,
      headerRow: 3,
      dataStartRow: 4,
    };
  }

  const firstNonBlank = cells
    .filter((cell) => cell.value.trim())
    .sort((a, b) => a.rowNumber - b.rowNumber)[0];

  if (
    firstNonBlank &&
    COMMON_HEADERS.has(firstNonBlank.value.trim().toLowerCase())
  ) {
    return {
      layout: "generic_header" as const,
      headerRow: firstNonBlank.rowNumber,
      dataStartRow: firstNonBlank.rowNumber + 1,
    };
  }

  return {
    layout: "headerless" as const,
    headerRow: null,
    dataStartRow: firstNonBlank?.rowNumber ?? 1,
  };
}

function validateRows(
  cells: CellValue[],
  dataStartRow: number,
  maxRow: number,
): {
  rows: ImportRow[];
  issues: ImportIssue[];
  blankCount: number;
} {
  const cellsByRow = new Map(cells.map((cell) => [cell.rowNumber, cell]));
  const seen = new Map<string, number>();
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  let blankCount = 0;

  for (let rowNumber = dataStartRow; rowNumber <= maxRow; rowNumber += 1) {
    const sourceCell = cellsByRow.get(rowNumber);
    const rawValue = sourceCell?.value ?? "";
    const normalizedSymbol = rawValue.trim().toUpperCase();

    if (!normalizedSymbol) {
      blankCount += 1;
      continue;
    }

    if (sourceCell?.formula) {
      rows.push({
        rowNumber,
        rawValue,
        normalizedSymbol,
        status: "invalid",
        message: "Formula-backed identifiers are quarantined.",
      });
      issues.push({
        severity: "error",
        rowNumber,
        message: "Column A contains a formula-backed identifier.",
      });
      continue;
    }

    if (!SYMBOL_PATTERN.test(normalizedSymbol)) {
      rows.push({
        rowNumber,
        rawValue,
        normalizedSymbol,
        status: "invalid",
        message: "Not a usable stock identifier.",
      });
      issues.push({
        severity: "error",
        rowNumber,
        message: `"${rawValue}" is not a usable stock identifier.`,
      });
      continue;
    }

    const duplicateOfRow = seen.get(normalizedSymbol);
    if (duplicateOfRow !== undefined) {
      rows.push({
        rowNumber,
        rawValue,
        normalizedSymbol,
        status: "duplicate",
        duplicateOfRow,
        message: `Duplicate of row ${duplicateOfRow}.`,
      });
      continue;
    }

    seen.set(normalizedSymbol, rowNumber);
    rows.push({
      rowNumber,
      rawValue,
      normalizedSymbol,
      status: "valid",
    });
  }

  return { rows, issues, blankCount };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const stableBytes = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", stableBytes.buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function parseXlsxBytes(
  bytes: Uint8Array,
  fileName: string,
): Promise<WorkbookPreview> {
  if (bytes.byteLength > MAX_WORKBOOK_BYTES) {
    throw new Error("Workbook exceeds the 10 MB preview limit.");
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("The selected file is not a readable .xlsx workbook.");
  }

  const totalUncompressedBytes = Object.values(files).reduce(
    (total, part) => total + part.byteLength,
    0,
  );
  if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    throw new Error("Workbook expands beyond the 50 MB safety limit.");
  }

  const workbookDocument = decodeXml(files, "xl/workbook.xml");
  const relationshipsDocument = decodeXml(
    files,
    "xl/_rels/workbook.xml.rels",
  );
  const workbook = asNode(workbookDocument.workbook);
  const sheetsNode = asNode(workbook.sheets);
  const sheetEntries = asArray(sheetsNode.sheet);

  if (sheetEntries.length === 0) {
    throw new Error("Workbook does not contain a worksheet.");
  }

  const relationships = asArray(
    asNode(relationshipsDocument.Relationships).Relationship,
  );
  const relationshipTargets = new Map(
    relationships.map((relationshipValue) => {
      const relationship = asNode(relationshipValue);
      return [
        stringValue(relationship["@_Id"]),
        stringValue(relationship["@_Target"]),
      ];
    }),
  );

  const worksheetNames = sheetEntries.map((entry) =>
    stringValue(asNode(entry)["@_name"]),
  );
  const selectedSheet = asNode(sheetEntries[0]);
  const worksheet = worksheetNames[0] || "Sheet1";
  const relationshipId = stringValue(
    selectedSheet["@_r:id"] ?? selectedSheet["@_id"],
  );
  const target = relationshipTargets.get(relationshipId);

  if (!target) {
    throw new Error("Workbook worksheet relationship is missing.");
  }

  const sheetDocument = decodeXml(files, normalizePartPath(target));
  const sharedStrings = getSharedStrings(files);
  const { cells, maxRow } = readColumnA(sheetDocument, sharedStrings);
  const detected = detectLayout(cells);
  const validated = validateRows(cells, detected.dataStartRow, maxRow);
  const issues = [...validated.issues];

  if (detected.layout === "headerless") {
    issues.unshift({
      severity: "warning",
      message:
        "No supported header was detected. Confirm the first data row before committing.",
    });
  }
  if (worksheetNames.length > 1) {
    issues.unshift({
      severity: "warning",
      message: `This preview uses ${worksheet}; worksheet selection is required before commit.`,
    });
  }

  const duplicateCount = validated.rows.filter(
    (row) => row.status === "duplicate",
  ).length;
  const invalidCount = validated.rows.filter(
    (row) => row.status === "invalid",
  ).length;
  const candidateCount = validated.rows.filter(
    (row) => row.status === "valid",
  ).length;

  return {
    fileName,
    fileSize: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    worksheet,
    worksheetNames,
    layout: detected.layout,
    headerRow: detected.headerRow,
    dataStartRow: detected.dataStartRow,
    sourceRowCount: Math.max(0, maxRow - detected.dataStartRow + 1),
    blankCount: validated.blankCount,
    candidateCount,
    duplicateCount,
    invalidCount,
    rows: validated.rows,
    issues,
  };
}

export async function parseWorkbookFile(file: File): Promise<WorkbookPreview> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Choose an .xlsx workbook.");
  }
  return parseXlsxBytes(new Uint8Array(await file.arrayBuffer()), file.name);
}
