import { db } from "@/lib/db";
import { flagKey } from "@/lib/monitoring/flags";
import { flagReviewSchema } from "@/lib/schemas/forms";
import { requireLecturer } from "@/lib/server/guards";
import { loadTeamMonitoring } from "@/lib/server/monitoring";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

/**
 * Lecturer: mark a flag reviewed, dismiss it with a reason, or reopen it. Each action is kept (flag history)
 * with the evidence as computed now.
 */
export const POST = route(async (req) => {
  const user = await requireLecturer();
  const input = await parseJson(req, flagReviewSchema);
  const member = await db.membership.findUnique({ where: { id: input.membershipId }, select: { teamId: true } });
  if (!member) throw notFound("Member");
  const m = await loadTeamMonitoring(member.teamId, user);
  const flag = m.flags.find((f) => flagKey(f) === flagKey({ memberId: input.membershipId, type: input.type, periodKey: input.periodKey }));
  if (!flag) throw new HttpError(404, "This flag is no longer raised.");
  await db.flagReview.create({
    data: {
      membershipId: input.membershipId,
      type: input.type,
      periodKey: input.periodKey,
      status: input.status,
      reason: input.reason,
      evidence: { summary: flag.summary, lines: flag.evidence },
      reviewedById: user.userId,
    },
  });
  return ok({ ok: true });
});
