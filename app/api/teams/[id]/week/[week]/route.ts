import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { weeklyReportSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { loadWeekReports } from "@/lib/server/forms/team-forms";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";

async function weekParam(params: Promise<{ id: string; week: string }>) {
  const { id, week } = await params;
  const w = Number(week);
  if (!Number.isInteger(w)) throw new HttpError(400, "Week must be a number.");
  return { id, w };
}

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/week/[week]">) => {
  const { id, w } = await weekParam(params);
  await requireTeamForm(id, "read");
  const d = await loadWeekReports(id, w);
  if (d.week !== w) throw new HttpError(404, "No report is due for that week.");
  return ok({ week: w, report: d.report, live: d.live, status: d.list.find((x) => x.week === w) });
});

/**
 * Saves the week's report (Team Leader). `submit: true` freezes the computed figures as a snapshot and
 * records the first submission time; later saves update the text (and the snapshot if submitted again).
 */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/week/[week]">) => {
  const { id, w } = await weekParam(params);
  const { user } = await requireTeamForm(id, "write");
  const input = await parseJson(req, weeklyReportSchema);
  const d = await loadWeekReports(id, w);
  if (d.week !== w || !d.live) throw new HttpError(404, "No report is due for that week.");
  const text = { tasksCompleted: input.tasksCompleted, risksIssues: input.risksIssues, nextWeekPlan: input.nextWeekPlan };
  const submit = input.submit
    ? { snapshot: d.live as unknown as Prisma.InputJsonValue, ...(d.report?.submittedAt ? {} : { submittedAt: new Date(), submittedById: user.userId }) }
    : {};
  await db.weeklyReport.upsert({
    where: { teamId_week: { teamId: id, week: w } },
    create: { teamId: id, week: w, ...text, ...submit, ...created(user.userId) },
    update: { ...text, ...submit, ...updated(user.userId) },
  });
  return ok({ ok: true });
});
