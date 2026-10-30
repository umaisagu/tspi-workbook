import { readFile } from "node:fs/promises";
import path from "node:path";
import { REFERENCE_FILES, isReferenceFile } from "@/lib/reference/workbook";
import { notFound, route } from "@/lib/server/http";
import { requireApiUser } from "@/lib/server/viewer";

/** The lecturer's Workbook v3.0 and its worked sample, for any signed-in user (files traced in next.config.ts). */
export const GET = route(async (_req, { params }: RouteContext<"/api/reference/[file]">) => {
  await requireApiUser();
  const { file } = await params;
  if (!isReferenceFile(file)) throw notFound("File");
  const name = REFERENCE_FILES[file].file;
  const body = await readFile(path.join(process.cwd(), "docs", "workbook-v3", name));
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
