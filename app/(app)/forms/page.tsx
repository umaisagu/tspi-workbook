import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/server/viewer";
import { currentTeamFor } from "@/lib/server/teams";
import { AVAILABLE_FORMS, FORM_INFO } from "@/lib/forms";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsPage() {
  const user = await requirePageUser();
  const current = await currentTeamFor(user);
  if (!current) {
    return (
      <>
        <PageHeader title="Forms" />
        <Alert kind="info">You can fill in your forms once you are in a team.</Alert>
      </>
    );
  }
  const { team, membership } = current;
  const [si, logt, logd, logai, reviews] = await Promise.all([
    db.studentInfo.findUnique({ where: { membershipId: membership.membershipId }, select: { submittedAt: true } }),
    db.timeLog.count({ where: { membershipId: membership.membershipId, deletedAt: null } }),
    db.defectLog.count({ where: { membershipId: membership.membershipId, deletedAt: null } }),
    db.aiLog.count({ where: { membershipId: membership.membershipId, deletedAt: null } }),
    db.aiLog.count({ where: { reviewerMembershipId: membership.membershipId, approved: false, deletedAt: null } }),
  ]);
  const status: Record<string, React.ReactNode> = {
    SI: si?.submittedAt ? <Badge tone="green">Submitted</Badge> : <Badge tone="amber">To do</Badge>,
    LOGT: <Badge>{logt} entries</Badge>,
    LOGD: <Badge>{logd} defects</Badge>,
    LOGAI: (
      <>
        <Badge>{logai} entries</Badge> {reviews > 0 && <Badge tone="amber">{reviews} to review</Badge>}
      </>
    ),
  };
  return (
    <div className="space-y-5">
      <PageHeader title="My forms" subtitle={`${team.name} · individual forms`} />
      <div className="grid gap-3 md:grid-cols-2">
        {AVAILABLE_FORMS.filter((f) => FORM_INFO[f].individual).map((f) => (
          <Link key={f} href={`/t/${team.id}/forms/${FORM_INFO[f].slug}`} className="block">
            <Card title={FORM_INFO[f].title} actions={<span>{status[f]}</span>}>
              <p className="text-sm text-slate-600">{FORM_INFO[f].description}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Alert kind="info">Team forms (TASK, SCHEDULE, LOGTEST, WEEK, summaries) arrive in the next stages.</Alert>
    </div>
  );
}
