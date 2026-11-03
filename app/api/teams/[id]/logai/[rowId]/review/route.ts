import { db } from "@/lib/db";
import { activeMembershipIn } from "@/lib/auth/permissions";
import { aiReviewSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";
import { requireApiUser } from "@/lib/server/viewer";
import { isApprovedVerdict } from "@/lib/tsp/ai-log";

/** The teammate named as reviewer gives the verdict; Approved and Approved with changes count as approved. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/logai/[rowId]/review">) => {
  const { id, rowId } = await params;
  const user = await requireApiUser();
  const mine = activeMembershipIn(user, id);
  const row = await db.aiLog.findFirst({ where: { id: rowId, deletedAt: null, membership: { teamId: id } } });
  if (!row || !mine) throw notFound("Entry");
  if (row.reviewerMembershipId !== mine.membershipId) throw forbidden();
  const { verdict } = await parseJson(req, aiReviewSchema);
  const approved = isApprovedVerdict(verdict);
  await db.aiLog.update({
    where: { id: rowId },
    data: { verdict, approved, approvedAt: approved ? new Date() : null, ...updated(user.userId) },
  });
  return ok({ ok: true });
});
