import "server-only";
import type { FormType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
export { canComment, canReadComments } from "@/lib/auth/permissions";

export async function listComments(teamId: string, form: FormType, membershipId: string | null) {
  const rows = await db.formComment.findMany({
    where: { teamId, formType: form, membershipId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, appRole: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    recordId: c.recordId,
    authorName: c.author.name,
    authorRole: c.author.appRole,
    createdAt: c.createdAt.toISOString(),
  }));
}
export type CommentRow = Awaited<ReturnType<typeof listComments>>[number];
