import "server-only";
import { fileName, type ExportDoc, type ExportFormat } from "@/lib/export/document";
import { renderPdf } from "@/lib/export/pdf";
import { renderXlsx } from "@/lib/export/xlsx";
import { HttpError } from "@/lib/server/http";

const TYPES: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export function exportFormat(value: string | null): ExportFormat {
  if (value === "xlsx" || value === "pdf") return value;
  throw new HttpError(400, "Format must be xlsx or pdf.");
}

/** Renders the document and returns it as a download (never cached: exports are per-user and private). */
export async function exportResponse(doc: ExportDoc, format: ExportFormat, parts: readonly string[]): Promise<Response> {
  const body = format === "xlsx" ? await renderXlsx(doc) : await renderPdf(doc);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": TYPES[format],
      "Content-Disposition": `attachment; filename="${fileName(parts, format)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
