import { db } from "@/lib/db";
import { activeMembershipIn, canAddTeamRow, canDecideChange } from "@/lib/auth/permissions";
import { changeRequestSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { assertComponent, logDate, withSequenceRetry } from "@/lib/server/forms/refs";
import { listChangeRequests } from "@/lib/server/forms/team-forms";
import { forbidden, ok, parseJson, route } from "@/lib/server/http";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/ccr">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  return ok(await listChangeRequests(id));
});

/** Any member raises a change request; only the Team Leader can create it already decided. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/ccr">) => {
  const { id } = await params;
  const { user, team } = await requireTeamForm(id, "read");
  if (!canAddTeamRow(user, team)) throw forbidden();
  const input = await parseJson(req, changeRequestSchema);
  await assertComponent(id, input.componentId);
  const decided = input.status !== "SUBMITTED";
  if (decided && !canDecideChange(user, team)) throw forbidden();
  const date = logDate(input.date);
  const row = await withSequenceRetry(async () => {
    const last = await db.changeRequest.aggregate({ where: { teamId: id }, _max: { number: true } });
    return db.changeRequest.create({
      data: {
        ...input,
        date,
        teamId: id,
        number: (last._max.number ?? 0) + 1,
        requesterMembershipId: activeMembershipIn(user, id)!.membershipId,
        ...(decided ? { decidedById: user.userId, decidedAt: new Date() } : {}),
        ...created(user.userId),
      },
    });
  });
  return ok({ id: row.id, number: row.number }, 201);
});
