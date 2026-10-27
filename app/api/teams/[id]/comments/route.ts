import { db } from "@/lib/db";
import { INDIVIDUAL_FORMS } from "@/lib/auth/permissions";
import { commentSchema } from "@/lib/schemas/forms";
import { formTypeSchema } from "@/lib/schemas/admin";
import { canComment, canReadComments, listComments } from "@/lib/server/forms/comments";
import { loadTeam } from "@/lib/server/guards";
import { HttpError, forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";
import { requireApiUser } from "@/lib/server/viewer";

async function checkMember(teamId: string, form: string, membershipId: string | null) {
  if (!INDIVIDUAL_FORMS.includes(formTypeSchema.parse(form))) return null;
  if (!membershipId) throw new HttpError(400, "Choose a team member.");
  const m = await db.membership.findFirst({ where: { id: membershipId, teamId }, select: { id: true } });
  if (!m) throw notFound("Member");
  return membershipId;
}

export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/comments">) => {
  const { id } = await params;
  const user = await requireApiUser();
  const team = await loadTeam(id);
  const sp = new URL(req.url).searchParams;
  const form = formTypeSchema.parse(sp.get("form"));
  const membershipId = await checkMember(id, form, sp.get("member"));
  if (!canReadComments(user, team, form, membershipId)) throw notFound("Form");
  return ok(await listComments(id, form, membershipId));
});

/** Demonstrators (own lab groups) and the lecturer comment on forms. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/comments">) => {
  const { id } = await params;
  const user = await requireApiUser();
  const team = await loadTeam(id);
  const input = await parseJson(req, commentSchema);
  if (input.formType === "PEER") throw forbidden();
  const membershipId = await checkMember(id, input.formType, input.membershipId);
  if (!canComment(user, team) || !canReadComments(user, team, input.formType, membershipId)) throw forbidden();
  const c = await db.formComment.create({
    data: { teamId: id, formType: input.formType, membershipId, recordId: input.recordId, authorId: user.userId, body: input.body },
  });
  return ok({ id: c.id }, 201);
});
