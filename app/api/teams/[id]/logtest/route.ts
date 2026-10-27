import { db } from "@/lib/db";
import { activeMembershipIn, canAddTeamRow, isTeamLeaderOf } from "@/lib/auth/permissions";
import { testLogSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { assertTeammate, logDate, withSequenceRetry } from "@/lib/server/forms/refs";
import { listTests } from "@/lib/server/forms/team-forms";
import { HttpError, forbidden, ok, parseJson, route } from "@/lib/server/http";
import { nextTestCode } from "@/lib/tsp/test-log";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/logtest">) => {
  const { id } = await params;
  const { team } = await requireTeamForm(id, "read");
  return ok(await listTests(id, team.week1Monday));
});

/** Any member records their own test cases; the Team Leader may record one for another member. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/logtest">) => {
  const { id } = await params;
  const { user, team } = await requireTeamForm(id, "read");
  if (!canAddTeamRow(user, team)) throw forbidden();
  const input = await parseJson(req, testLogSchema);
  const me = activeMembershipIn(user, id)!.membershipId;
  const author = input.authorMembershipId && isTeamLeaderOf(user, id) ? input.authorMembershipId : me;
  await assertTeammate(id, author, "", "authorMembershipId");
  const date = logDate(input.date);
  if (input.testCode && (await db.testLog.findUnique({ where: { teamId_testCode: { teamId: id, testCode: input.testCode } } }))) {
    throw new HttpError(409, "Please correct the highlighted fields.", { testCode: ["This test ID is already used"] });
  }
  const row = await withSequenceRetry(async () => {
    const codes = await db.testLog.findMany({ where: { teamId: id }, select: { testCode: true } });
    const { authorMembershipId: _a, testCode, ...rest } = input;
    return db.testLog.create({
      data: { ...rest, date, teamId: id, testCode: testCode ?? nextTestCode(codes.map((c) => c.testCode)), authorMembershipId: author, ...created(user.userId) },
    });
  });
  return ok({ id: row.id, testCode: row.testCode }, 201);
});
