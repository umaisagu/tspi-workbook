import { db } from "@/lib/db";
import { aiLogSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { assertTeammate, logDate } from "@/lib/server/forms/refs";
import { notFound, ok, parseJson, route } from "@/lib/server/http";
import { AI_LOG_REVIEWED_FIELDS } from "@/lib/tsp/ai-log";

async function ownRow(teamId: string, rowId: string) {
  const ctx = await requireIndividualForm(teamId, null, "LOGAI", "write");
  const row = await db.aiLog.findFirst({ where: { id: rowId, membershipId: ctx.ownerMembershipId, deletedAt: null } });
  if (!row) throw notFound("Entry");
  return { ctx, row };
}

/** Editing reviewed content, or changing the reviewer, withdraws an earlier approval. */
export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/logai/[rowId]">) => {
  const { id, rowId } = await params;
  const { ctx, row } = await ownRow(id, rowId);
  const input = await parseJson(req, aiLogSchema);
  await assertTeammate(id, input.reviewerMembershipId, ctx.ownerMembershipId, "reviewerMembershipId");
  const changed =
    AI_LOG_REVIEWED_FIELDS.some((f) => (row[f] ?? null) !== (input[f] ?? null)) || row.reviewerMembershipId !== input.reviewerMembershipId;
  await db.aiLog.update({
    where: { id: rowId },
    data: {
      ...input,
      date: logDate(input.date),
      ...(changed ? { approved: false, approvedAt: null } : {}),
      ...updated(ctx.user.userId),
    },
  });
  return ok({ ok: true, approvalWithdrawn: changed && row.approved });
});

export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/logai/[rowId]">) => {
  const { id, rowId } = await params;
  const { ctx } = await ownRow(id, rowId);
  await db.aiLog.update({ where: { id: rowId }, data: { deletedAt: new Date(), deletedById: ctx.user.userId } });
  return ok({ ok: true });
});
