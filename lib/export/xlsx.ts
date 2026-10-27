import "server-only";
import ExcelJS from "exceljs";
import { cellText, sheetNames, type ExportDoc } from "./document";

const NUM_FMT = { int: "0", dec: "0.00", pct: "0.0%" } as const;

/** One worksheet per section: title, notes, a bold header row (frozen), then the rows. */
export async function renderXlsx(doc: ExportDoc): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TSPi Workbook";
  wb.created = doc.generatedAt;
  const names = sheetNames(doc.sections.map((s) => s.title));
  doc.sections.forEach((section, i) => {
    const ws = wb.addWorksheet(names[i]);
    ws.addRow([doc.title]).font = { bold: true, size: 13 };
    ws.addRow([section.title]).font = { bold: true };
    if (doc.subtitle) ws.addRow([doc.subtitle]);
    for (const n of section.notes ?? []) ws.addRow([n]);
    ws.addRow([`Generated ${doc.generatedAt.toISOString().replace("T", " ").slice(0, 16)} UTC`]).font = { italic: true, color: { argb: "FF64748B" } };
    ws.addRow([]);
    const header = ws.addRow(section.columns.map((c) => c.header));
    header.font = { bold: true };
    header.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      c.alignment = { vertical: "top", wrapText: true };
    });
    ws.views = [{ state: "frozen", ySplit: header.number }];
    for (const r of section.rows) {
      const row = ws.addRow(
        section.columns.map((col, j) => {
          const v = r[j];
          if (typeof v === "number") return Number.isFinite(v) ? v : null;
          if (v === null || v === undefined || v === "") return null;
          return cellText(v, col.format);
        }),
      );
      section.columns.forEach((col, j) => {
        const cell = row.getCell(j + 1);
        if (col.format) cell.numFmt = NUM_FMT[col.format];
        if (typeof cell.value === "string" && cell.value.length > 40) cell.alignment = { vertical: "top", wrapText: true };
      });
    }
    section.columns.forEach((col, j) => {
      ws.getColumn(j + 1).width = Math.min(Math.max(col.width ?? 12, col.header.length + 2), 60);
    });
  });
  if (doc.sections.length === 0) wb.addWorksheet("Empty").addRow([doc.title, "No data"]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
