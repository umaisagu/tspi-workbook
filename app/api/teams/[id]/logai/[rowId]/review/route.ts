import { db } from "@/lib/db";
import { activeMembershipIn } from "@/lib/auth/permissions";
import { aiReviewSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";
import { requireApiUser } from "@/lib/server/viewer";

/** The teammate named as reviewer approves (or withdraws approval of) an AI usage entry. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/logai/[rowId]/review">) => {
  const { id, rowId } = await params;
  const user = await requireApiUser();
  const mine = activeMembershipIn(user, id);
  const row = await db.aiLog.findFirst({ where: { id: rowId, deletedAt: null, membership: { teamId: id } } });
  if (!row || !mine) throw notFound("Entry");
  if (row.reviewerMembershipId !== mine.membershipId) throw forbidden();
  const { approved } = await parseJson(req, aiReviewSchema);
  await db.aiLog.update({
    where: { id: rowId },
    data: { approved, approvedAt: approved ? new Date() : null, ...updated(user.userId) },
  });
  return ok({ ok: true });
});
