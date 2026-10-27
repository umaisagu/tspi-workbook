import { HttpError, route } from "@/lib/server/http";
import { requireLecturer } from "@/lib/server/guards";
import { contributionReport } from "@/lib/server/export/contribution";
import { exportResponse, exportFormat } from "@/lib/server/export/respond";

/** GET /api/export/contribution?member=&milestone=&format=xlsx|pdf — lecturer only (includes PEER). */
export const GET = route(async (req) => {
  const user = await requireLecturer();
  const url = new URL(req.url);
  const format = exportFormat(url.searchParams.get("format"));
  const member = url.searchParams.get("member");
  const milestone = url.searchParams.get("milestone");
  if (!member || !milestone) throw new HttpError(400, "Choose a member and a milestone.");
  const { doc, parts } = await contributionReport(member, milestone, user);
  return exportResponse(doc, format, parts);
});
