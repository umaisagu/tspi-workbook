import type { FormType } from "@/generated/prisma/enums";
import { canExportPrivate } from "@/lib/auth/permissions";
import { FORM_INFO } from "@/lib/forms";
import { HttpError, notFound, route } from "@/lib/server/http";
import { requireTeamExport } from "@/lib/server/export/access";
import { exportResponse, exportFormat } from "@/lib/server/export/respond";
import { EXPORT_FORMS, exportContext, formSections } from "@/lib/server/export/sections";

/** GET /api/export/form?team=&form=TASK&format=xlsx|pdf — one form of a team (individual forms: every member). */
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const format = exportFormat(url.searchParams.get("format"));
  const form = url.searchParams.get("form") as FormType | null;
  if (!form || !EXPORT_FORMS.includes(form)) throw new HttpError(400, "Unknown form.");
  const { user, info } = await requireTeamExport(url.searchParams.get("team"));
  if (form === "PEER" && !canExportPrivate(user)) throw notFound("Form");
  const now = new Date();
  const ctx = await exportContext(info.id, canExportPrivate(user), now);
  return exportResponse(
    {
      title: `${FORM_INFO[form].title} — ${info.name}`,
      subtitle: `${info.labGroup.name} · ${info.labGroup.semester.name}${info.projectTitle ? ` · ${info.projectTitle}` : ""}`,
      generatedAt: now,
      sections: await formSections(form, ctx),
    },
    format,
    [info.name, form],
  );
});
