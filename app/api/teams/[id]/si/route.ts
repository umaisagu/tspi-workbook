import { db } from "@/lib/db";
import { studentInfoSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { joinResidence, loadStudentInfo } from "@/lib/server/forms/student-info";
import { logDate } from "@/lib/server/forms/refs";
import { ok, parseJson, route } from "@/lib/server/http";

export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/si">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, new URL(req.url).searchParams.get("member"), "SI", "read");
  return ok(await loadStudentInfo(ctx.ownerMembershipId));
});

/** Saves the member's own FORM-SI. The declaration is required; the first save records the submission time. */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/si">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, null, "SI", "write");
  const input = await parseJson(req, studentInfoSchema);
  const now = new Date();
  const { residence: _r, residenceOther: _o, declared: _d, ...rest } = input;
  const data = { ...rest, date: logDate(input.date), residence: joinResidence(input) };
  const existing = await db.studentInfo.findUnique({ where: { membershipId: ctx.ownerMembershipId }, select: { submittedAt: true } });
  await db.studentInfo.upsert({
    where: { membershipId: ctx.ownerMembershipId },
    create: { ...data, membershipId: ctx.ownerMembershipId, declaredAt: now, submittedAt: now, ...created(ctx.user.userId) },
    update: { ...data, declaredAt: now, ...(existing?.submittedAt ? {} : { submittedAt: now }), ...updated(ctx.user.userId) },
  });
  return ok({ ok: true });
});
