import { db } from "@/lib/db";
import { canEditScheduleRow } from "@/lib/auth/permissions";
import { scheduleRowSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { loadPlanning } from "@/lib/server/forms/planning";
import { HttpError, forbidden, ok, parseJson, route } from "@/lib/server/http";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/schedule">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  const p = await loadPlanning(id);
  return ok({ currentWeek: p.currentWeek, grid: p.scheduleGrid, ...p.schedule });
});

/** Replaces one member's weekly plan hours. Members edit their own row; the Team Leader edits any. */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/schedule">) => {
  const { id } = await params;
  const { user, team } = await requireTeamForm(id, "read");
  const input = await parseJson(req, scheduleRowSchema);
  if (!canEditScheduleRow(user, team, input.membershipId)) throw forbidden();
  const member = await db.membership.findFirst({ where: { id: input.membershipId, teamId: id, leftAt: null } });
  if (!member) throw new HttpError(404, "Member not found.");
  const semester = await db.semester.findUniqueOrThrow({ where: { id: team.semesterId }, select: { weekCount: true } });
  const bad = input.weeks.find((w) => w.week > semester.weekCount);
  if (bad) throw new HttpError(400, `Week ${bad.week} is outside the semester (1–${semester.weekCount}).`);
  await db.$transaction(
    input.weeks.map((w) =>
      w.planHours > 0
        ? db.scheduleWeek.upsert({
            where: { membershipId_week: { membershipId: input.membershipId, week: w.week } },
            create: { teamId: id, membershipId: input.membershipId, week: w.week, planHours: w.planHours, ...created(user.userId) },
            update: { planHours: w.planHours, ...updated(user.userId) },
          })
        : db.scheduleWeek.deleteMany({ where: { membershipId: input.membershipId, week: w.week } }),
    ),
  );
  return ok({ ok: true });
});
