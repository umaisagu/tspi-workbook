import "server-only";
import PDFDocument from "pdfkit";
import { cellText, columnWidths, numericColumns, pdfSafe, tableWidth, type ExportDoc, type Section } from "./document";

const MARGIN = 36;
const FONT_SIZE = 7.5;
const PAD = 3;
const MAX_CELL_LINES = 6;

/** A4 landscape; each section is a titled table with the header repeated on every page. */
export async function renderPdf(doc: ExportDoc): Promise<Buffer> {
  const pdf = new PDFDocument({ size: "A4", layout: "landscape", margin: MARGIN, bufferPages: true, info: { Title: pdfSafe(doc.title), Creator: "TSPi Workbook" } });
  const chunks: Buffer[] = [];
  pdf.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  const width = pdf.page.width - 2 * MARGIN;
  pdf.font("Helvetica-Bold").fontSize(14).text(pdfSafe(doc.title));
  if (doc.subtitle) pdf.font("Helvetica").fontSize(9).fillColor("#334155").text(pdfSafe(doc.subtitle));
  pdf.font("Helvetica").fontSize(8).fillColor("#64748b").text(`Generated ${doc.generatedAt.toISOString().replace("T", " ").slice(0, 16)} UTC`);
  pdf.fillColor("black");
  if (doc.sections.length === 0) pdf.moveDown().fontSize(10).text("No data.");
  for (const s of doc.sections) drawSection(pdf, s, width);

  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    pdf.switchToPage(i);
    pdf.page.margins.bottom = 0; // the footer sits below the margin; without this pdfkit adds a page for it
    const y = pdf.page.height - MARGIN + 10;
    pdf.font("Helvetica").fontSize(7).fillColor("#64748b");
    pdf.text(`${pdfSafe(doc.title)} — page ${i + 1} of ${range.count}`, MARGIN, y, { width, align: "right", lineBreak: false });
  }
  pdf.end();
  return done;
}

function drawSection(pdf: PDFKit.PDFDocument, s: Section, width: number) {
  const bottom = () => pdf.page.height - MARGIN - 12;
  pdf.moveDown(1);
  if (pdf.y > bottom() - 60) pdf.addPage();
  pdf.x = MARGIN;
  pdf.font("Helvetica-Bold").fontSize(11).fillColor("black").text(pdfSafe(s.title), MARGIN, pdf.y, { width });
  pdf.font("Helvetica").fontSize(8).fillColor("#334155");
  for (const n of s.notes ?? []) pdf.text(pdfSafe(n), MARGIN, pdf.y, { width });
  pdf.fillColor("black").moveDown(0.4);
  if (s.columns.length === 0) return;

  const tw = tableWidth(s.columns, width);
  const widths = columnWidths(s.columns, tw);
  const numeric = numericColumns(s);
  const lineHeight = FONT_SIZE * 1.2;
  const rowHeight = (cells: string[], bold: boolean) => {
    pdf.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FONT_SIZE);
    const h = Math.max(...cells.map((t, j) => pdf.heightOfString(t, { width: widths[j]! - 2 * PAD })));
    return Math.min(h, lineHeight * MAX_CELL_LINES) + 2 * PAD;
  };
  const drawRow = (cells: string[], bold: boolean, fill: string | null) => {
    const h = rowHeight(cells, bold);
    const y = pdf.y;
    if (fill) pdf.rect(MARGIN, y, tw, h).fill(fill).fillColor("black");
    let x = MARGIN;
    pdf.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FONT_SIZE);
    cells.forEach((t, j) => {
      const w = widths[j]!;
      pdf.text(t, x + PAD, y + PAD, { width: w - 2 * PAD, height: h - 2 * PAD, align: numeric[j] ? "right" : "left", ellipsis: true });
      x += w;
    });
    pdf.moveTo(MARGIN, y + h).lineTo(MARGIN + tw, y + h).lineWidth(0.4).strokeColor("#cbd5e1").stroke();
    pdf.x = MARGIN;
    pdf.y = y + h;
  };

  const header = s.columns.map((c) => pdfSafe(c.header));
  drawRow(header, true, "#e2e8f0");
  if (s.rows.length === 0) {
    pdf.font("Helvetica-Oblique").fontSize(FONT_SIZE).text("No entries.", MARGIN + PAD, pdf.y + PAD);
    return;
  }
  s.rows.forEach((r, i) => {
    const cells = s.columns.map((c, j) => pdfSafe(cellText(r[j], c.format)));
    if (pdf.y + rowHeight(cells, false) > bottom()) {
      pdf.addPage();
      pdf.y = MARGIN;
      drawRow(header, true, "#e2e8f0");
    }
    drawRow(cells, false, i % 2 === 1 ? "#f8fafc" : null);
  });
}
