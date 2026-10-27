import { db } from "@/lib/db";
import { canEditOwnTeamRow, isTeamLeaderOf } from "@/lib/auth/permissions";
import { testLogSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { assertTeammate, logDate } from "@/lib/server/forms/refs";
import { HttpError, forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";

async function load(teamId: string, rowId: string) {
  const ctx = await requireTeamForm(teamId, "read");
  const row = await db.testLog.findFirst({ where: { id: rowId, teamId, deletedAt: null } });
  if (!row) throw notFound("Test");
  if (!canEditOwnTeamRow(ctx.user, ctx.team, row.authorMembershipId)) throw forbidden();
  return { ...ctx, row };
}

export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/logtest/[rowId]">) => {
  const { id, rowId } = await params;
  const { user, row } = await load(id, rowId);
  const input = await parseJson(req, testLogSchema);
  const author = input.authorMembershipId && isTeamLeaderOf(user, id) ? input.authorMembershipId : row.authorMembershipId;
  await assertTeammate(id, author, "", "authorMembershipId");
  const testCode = input.testCode ?? row.testCode;
  if (testCode !== row.testCode && (await db.testLog.findUnique({ where: { teamId_testCode: { teamId: id, testCode } } }))) {
    throw new HttpError(409, "Please correct the highlighted fields.", { testCode: ["This test ID is already used"] });
  }
  const { authorMembershipId: _a, testCode: _c, ...rest } = input;
  await db.testLog.update({
    where: { id: rowId },
    data: { ...rest, testCode, date: logDate(input.date), authorMembershipId: author, ...updated(user.userId) },
  });
  return ok({ ok: true });
});

export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/logtest/[rowId]">) => {
  const { id, rowId } = await params;
  const { user } = await load(id, rowId);
  await db.testLog.update({ where: { id: rowId }, data: { deletedAt: new Date(), deletedById: user.userId } });
  return ok({ ok: true });
});
