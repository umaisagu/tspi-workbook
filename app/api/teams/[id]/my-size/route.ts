import { db } from "@/lib/db";
import { memberSizeSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { ok, parseJson, route } from "@/lib/server/http";

/** MYSUMP "My Size Contribution": the member types their own plan and actual LOC, pages and screens. */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/my-size">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, null, "MYSUM", "write");
  const data = await parseJson(req, memberSizeSchema);
  await db.memberSize.upsert({
    where: { membershipId: ctx.ownerMembershipId },
    create: { ...data, membershipId: ctx.ownerMembershipId, ...created(ctx.user.userId) },
    update: { ...data, ...updated(ctx.user.userId) },
  });
  return ok({ ok: true });
});
