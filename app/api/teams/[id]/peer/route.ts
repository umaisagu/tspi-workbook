import { db } from "@/lib/db";
import { peerEvaluationSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { loadPeer } from "@/lib/server/forms/team-forms";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";

/** A member's own PEER evaluations (the lecturer may pass ?member=). */
export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/peer">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, new URL(req.url).searchParams.get("member"), "PEER", "read");
  return ok(await loadPeer(id, ctx.ownerMembershipId));
});

/**
 * Saves the member's ratings of themselves and their teammates for one milestone.
 * `submit: true` requires a rating for every current member and records the submission time.
 */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/peer">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, null, "PEER", "write");
  const input = await parseJson(req, peerEvaluationSchema);
  const team = await db.team.findUniqueOrThrow({ where: { id }, include: { labGroup: true } });
  const milestone = await db.milestone.findFirst({ where: { id: input.milestoneId, semesterId: team.labGroup.semesterId, peerRequired: true } });
  if (!milestone) throw new HttpError(404, "This milestone does not collect PEER evaluations.");
  const members = await db.membership.findMany({ where: { teamId: id, leftAt: null }, select: { id: true } });
  const memberIds = new Set(members.map((m) => m.id));
  const evaluatees = new Set(input.ratings.map((r) => r.evaluateeId));
  if ([...evaluatees].some((e) => !memberIds.has(e)) || evaluatees.size !== input.ratings.length) {
    throw new HttpError(400, "Rate each current team member once.");
  }
  if (input.submit && evaluatees.size !== memberIds.size) throw new HttpError(400, "Rate yourself and every teammate before submitting.");
  const now = new Date();
  // Keep the first submission time of each rating (lateness is judged on it).
  const existing = new Map(
    (await db.peerEvaluation.findMany({ where: { milestoneId: milestone.id, evaluatorId: ctx.ownerMembershipId }, select: { evaluateeId: true, submittedAt: true } })).map(
      (e) => [e.evaluateeId, e.submittedAt],
    ),
  );
  await db.$transaction(
    input.ratings.map((r) =>
      db.peerEvaluation.upsert({
        where: { milestoneId_evaluatorId_evaluateeId: { milestoneId: milestone.id, evaluatorId: ctx.ownerMembershipId, evaluateeId: r.evaluateeId } },
        create: {
          milestoneId: milestone.id,
          evaluatorId: ctx.ownerMembershipId,
          evaluateeId: r.evaluateeId,
          scores: r.scores,
          comment: r.comment,
          submittedAt: input.submit ? now : null,
          ...created(ctx.user.userId),
        },
        update: { scores: r.scores, comment: r.comment, ...(input.submit ? { submittedAt: existing.get(r.evaluateeId) ?? now } : {}), ...updated(ctx.user.userId) },
      }),
    ),
  );
  return ok({ ok: true });
});
