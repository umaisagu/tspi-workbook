import { canExportPrivate } from "@/lib/auth/permissions";
import { route } from "@/lib/server/http";
import { requireTeamExport } from "@/lib/server/export/access";
import { exportResponse, exportFormat } from "@/lib/server/export/respond";
import { EXPORT_FORMS, exportContext, formSections, membersSection, today } from "@/lib/server/export/sections";

export const maxDuration = 60;

/** GET /api/export/team?team=&format=xlsx|pdf — every form of a team (PEER only for the lecturer). */
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const format = exportFormat(url.searchParams.get("format"));
  const { user, info } = await requireTeamExport(url.searchParams.get("team"));
  const now = new Date();
  const ctx = await exportContext(info.id, canExportPrivate(user), now);
  const sections = [membersSection(ctx)];
  for (const form of EXPORT_FORMS) sections.push(...(await formSections(form, ctx)));
  return exportResponse(
    {
      title: `TSPi workbook — ${info.name}`,
      subtitle: `${info.labGroup.name} · ${info.labGroup.semester.name}${info.projectTitle ? ` · ${info.projectTitle}` : ""} · week ${ctx.planning.currentWeek}`,
      generatedAt: now,
      sections,
    },
    format,
    [info.name, "workbook", today(now)],
  );
});
