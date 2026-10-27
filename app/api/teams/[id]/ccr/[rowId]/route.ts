import { db } from "@/lib/db";
import { canDecideChange, canEditOwnTeamRow } from "@/lib/auth/permissions";
import { changeRequestSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { assertComponent, logDate } from "@/lib/server/forms/refs";
import { HttpError, forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";

async function load(teamId: string, rowId: string) {
  const ctx = await requireTeamForm(teamId, "read");
  const row = await db.changeRequest.findFirst({ where: { id: rowId, teamId, deletedAt: null } });
  if (!row) throw notFound("Change request");
  return { ...ctx, row };
}

/**
 * The requester edits their request while it is still SUBMITTED; the Team Leader edits any request and
 * decides it (approve / reject / implemented), which records who decided and when.
 */
export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/ccr/[rowId]">) => {
  const { id, rowId } = await params;
  const { user, team, row } = await load(id, rowId);
  const leader = canDecideChange(user, team);
  if (!leader && !(canEditOwnTeamRow(user, team, row.requesterMembershipId) && row.status === "SUBMITTED")) throw forbidden();
  const input = await parseJson(req, changeRequestSchema);
  if (input.status !== row.status && !leader) throw new HttpError(403, "Only the Team Leader can change the status of a change request.");
  await assertComponent(id, input.componentId);
  const statusChanged = input.status !== row.status;
  await db.changeRequest.update({
    where: { id: rowId },
    data: {
      ...input,
      date: logDate(input.date),
      ...(statusChanged ? (input.status === "SUBMITTED" ? { decidedById: null, decidedAt: null } : { decidedById: user.userId, decidedAt: new Date() }) : {}),
      ...updated(user.userId),
    },
  });
  return ok({ ok: true });
});

export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/ccr/[rowId]">) => {
  const { id, rowId } = await params;
  const { user, team, row } = await load(id, rowId);
  if (!canDecideChange(user, team) && !(canEditOwnTeamRow(user, team, row.requesterMembershipId) && row.status === "SUBMITTED")) throw forbidden();
  await db.changeRequest.update({ where: { id: rowId }, data: { deletedAt: new Date(), deletedById: user.userId } });
  return ok({ ok: true });
});
