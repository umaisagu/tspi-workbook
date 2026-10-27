import { db } from "@/lib/db";
import { aiLogSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { listAiLogs } from "@/lib/server/forms/logs";
import { assertTeammate, logDate, withSequenceRetry } from "@/lib/server/forms/refs";
import { ok, parseJson, route } from "@/lib/server/http";
import { nextAiCode } from "@/lib/tsp/ai-log";

const member = (req: Request) => new URL(req.url).searchParams.get("member");

export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/logai">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, member(req), "LOGAI", "read");
  return ok(await listAiLogs(ctx.ownerMembershipId, ctx.team.week1Monday));
});

/** Adds an AI usage entry (AI-001, AI-002, … per student). */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/logai">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, null, "LOGAI", "write");
  const input = await parseJson(req, aiLogSchema);
  await assertTeammate(id, input.reviewerMembershipId, ctx.ownerMembershipId, "reviewerMembershipId");
  const date = logDate(input.date);
  const row = await withSequenceRetry(async () => {
    const codes = await db.aiLog.findMany({ where: { membershipId: ctx.ownerMembershipId }, select: { code: true } });
    return db.aiLog.create({
      data: { ...input, date, membershipId: ctx.ownerMembershipId, code: nextAiCode(codes.map((c) => c.code)), ...created(ctx.user.userId) },
    });
  });
  return ok({ id: row.id, code: row.code }, 201);
});
