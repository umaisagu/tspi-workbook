/**
 * Export document model: a title and a list of tables (sections), rendered to Excel (one sheet per
 * section) or PDF (one table after another). Pure; the renderers live in xlsx.ts and pdf.ts.
 */
export type Cell = string | number | boolean | null | undefined;

export interface Column {
  header: string;
  /** Relative width (characters in Excel, proportional in PDF). Default 12. */
  width?: number;
  /** Number format: integer, 2 decimals, percentage of a 0..1 fraction. Text otherwise. */
  format?: "int" | "dec" | "pct";
}

export interface Section {
  title: string;
  /** Short lines shown above the table (key figures, notes). */
  notes?: string[];
  columns: Column[];
  rows: Cell[][];
}

export interface ExportDoc {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  sections: Section[];
}

export type ExportFormat = "xlsx" | "pdf";

/** Text of a cell as shown in the PDF (and in Excel for non-numbers). */
export function cellText(value: Cell, format?: Column["format"]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (format === "pct") return `${(value * 100).toFixed(1)}%`;
    if (format === "int") return String(Math.round(value));
    if (format === "dec") return value.toFixed(2);
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return value;
}

const REPLACEMENTS: [RegExp, string][] = [
  [/[≤]/g, "<="],
  [/[≥]/g, ">="],
  [/[−]/g, "-"],
  [/[✓✔]/g, "v"],
  [/[✗✘]/g, "x"],
  [/[→]/g, "->"],
  [/[÷]/g, "/"],
  [/[‘’]/g, "'"],
  [/[“”]/g, '"'],
];

/**
 * The PDF uses the standard Helvetica font (WinAnsi encoding, no embedded fonts), so characters outside
 * Latin-1 plus a few typographic marks are replaced or dropped.
 */
export function pdfSafe(text: string): string {
  let out = text;
  for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
  // Keep Latin-1, the dashes/bullet/ellipsis WinAnsi has, tab and newline; drop the rest.
  return out.replace(/[^\t\n\x20-\x7e\xa0-\xff–—•…]/g, "");
}

/** Excel sheet names: ≤ 31 characters, none of []:*?/\, unique within the workbook. */
export function sheetNames(titles: readonly string[]): string[] {
  const used = new Set<string>();
  return titles.map((t) => {
    const base = (t.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim() || "Sheet").slice(0, 31);
    let name = base;
    for (let i = 2; used.has(name.toLowerCase()); i++) {
      const suffix = ` (${i})`;
      name = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

/** A safe download file name: letters, digits, dot, dash and underscore. */
export function fileName(parts: readonly string[], format: ExportFormat): string {
  const stem = parts
    .map((p) => p.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("_");
  return `${stem || "export"}.${format}`;
}

/** Points per unit of relative column width in the PDF (≈ one character at the table font size). */
export const PDF_POINTS_PER_UNIT = 5.2;

/** A table is as wide as its columns need, up to the page width. */
export function tableWidth(columns: readonly Column[], max: number): number {
  return Math.min(max, columns.reduce((s, c) => s + (c.width ?? 12), 0) * PDF_POINTS_PER_UNIT);
}

/** Columns whose cells are numbers are right-aligned (header included). */
export function numericColumns(section: Pick<Section, "columns" | "rows">): boolean[] {
  return section.columns.map((c, j) => c.format !== undefined || section.rows.some((r) => typeof r[j] === "number"));
}

/** Splits columns into PDF widths proportional to their relative widths. */
export function columnWidths(columns: readonly Column[], total: number): number[] {
  const rel = columns.map((c) => c.width ?? 12);
  const sum = rel.reduce((s, w) => s + w, 0) || 1;
  return rel.map((w) => (w / sum) * total);
}
