import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { activeMembershipIn, canComment, isStaff } from "@/lib/auth/permissions";
import { AVAILABLE_FORMS, FORM_INFO, formFromSlug } from "@/lib/forms";
import { HttpError } from "@/lib/server/http";
import { requirePageUser } from "@/lib/server/viewer";
import { individualFormAccess } from "@/lib/server/forms/access";
import { listComments } from "@/lib/server/forms/comments";
import {
  listAiLogs,
  listAiReviewRequests,
  listComponents,
  listDefectLogs,
  listTaskOptions,
  listTeammates,
  listTimeLogs,
} from "@/lib/server/forms/logs";
import { loadStudentInfo } from "@/lib/server/forms/student-info";
import { siFormValues } from "@/lib/server/forms/student-info-defaults";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { CommentsPanel } from "@/components/forms/comments-panel";
import { MemberPicker } from "@/components/forms/member-picker";
import { LogtForm } from "@/components/forms/logt-form";
import { LogdForm } from "@/components/forms/logd-form";
import { AiReviewList, LogaiForm } from "@/components/forms/logai-form";
import { StudentInfoForm } from "@/components/forms/student-info-form";
import { phaseName } from "@/lib/tsp/phases";

export async function generateMetadata({ params }: PageProps<"/t/[teamId]/forms/[form]">): Promise<Metadata> {
  const { form } = await params;
  const f = formFromSlug(form);
  return { title: f ? FORM_INFO[f].title.split(" · ")[0] : "Form" };
}

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

export default async function FormPage({ params, searchParams }: PageProps<"/t/[teamId]/forms/[form]">) {
  const user = await requirePageUser();
  const { teamId, form: slug } = await params;
  const sp = await searchParams;
  const form = formFromSlug(slug);
  if (!form || !AVAILABLE_FORMS.includes(form) || !FORM_INFO[form].individual) notFound();

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { labGroup: { include: { semester: true } } },
  });
  if (!team) notFound();
  const teammates = await listTeammates(teamId);
  const own = activeMembershipIn(user, teamId);
  const memberParam = typeof sp.member === "string" ? sp.member : undefined;
  const member = memberParam ?? own?.membershipId ?? teammates[0]?.membershipId;
  if (!member) {
    return (
      <>
        <PageHeader title={FORM_INFO[form].title} subtitle={team.name} />
        <Alert kind="info">This team has no members yet.</Alert>
      </>
    );
  }

  let ctx;
  try {
    ctx = await individualFormAccess(user, teamId, member, form, "read");
  } catch (err) {
    if (err instanceof HttpError) notFound();
    throw err;
  }
  const owner = await db.membership.findUniqueOrThrow({ where: { id: ctx.ownerMembershipId }, include: { user: true } });
  const week1 = team.labGroup.semester.week1Monday;
  const hidden = team.labGroup.semester.hiddenPhases;
  const comments = await listComments(teamId, form, ctx.ownerMembershipId);
  const staffView = isStaff(user);

  let body: React.ReactNode;
  if (form === "LOGT") {
    const [rows, components, tasks] = await Promise.all([listTimeLogs(ctx.ownerMembershipId, week1), listComponents(teamId), listTaskOptions(teamId)]);
    body = (
      <LogtForm
        teamId={teamId}
        rows={rows}
        canEdit={ctx.canEdit}
        hiddenPhases={hidden}
        components={components.map((c) => ({ value: c.id, label: c.name }))}
        tasks={tasks.map((t) => ({ value: t.id, label: `${t.name} (${t.phase} – ${phaseName(t.phase)})` }))}
      />
    );
  } else if (form === "LOGD") {
    const [rows, components] = await Promise.all([listDefectLogs(ctx.ownerMembershipId, week1), listComponents(teamId)]);
    body = (
      <LogdForm
        teamId={teamId}
        rows={rows}
        canEdit={ctx.canEdit}
        hiddenPhases={hidden}
        components={components.map((c) => ({ value: c.id, label: c.name }))}
      />
    );
  } else if (form === "LOGAI") {
    const [rows, reviews] = await Promise.all([
      listAiLogs(ctx.ownerMembershipId, week1),
      ctx.canEdit ? listAiReviewRequests(ctx.ownerMembershipId, week1) : Promise.resolve([]),
    ]);
    body = (
      <div className="space-y-5">
        <LogaiForm
          teamId={teamId}
          rows={rows}
          canEdit={ctx.canEdit}
          teammates={teammates.filter((t) => t.membershipId !== ctx.ownerMembershipId).map((t) => ({ value: t.membershipId, label: t.name }))}
        />
        {ctx.canEdit && (
          <Card title="Reviews requested from you">
            <AiReviewList teamId={teamId} rows={reviews} />
          </Card>
        )}
      </div>
    );
  } else {
    const stored = await loadStudentInfo(ctx.ownerMembershipId);
    if (!stored && !ctx.canEdit) {
      body = <Alert kind="info">{owner.user.name} has not submitted FORM-SI yet.</Alert>;
    } else {
      body = (
        <StudentInfoForm
          teamId={teamId}
          initial={siFormValues(stored, { name: owner.user.name, email: owner.user.email })}
          email={owner.user.email}
          labGroup={`${team.labGroup.name}${team.labGroup.schedule ? ` (${team.labGroup.schedule})` : ""}`}
          readOnly={!ctx.canEdit}
          submittedAt={stored?.submittedAt ?? null}
        />
      );
    }
  }

  const status =
    form === "SI" ? (
      (await db.studentInfo.findUnique({ where: { membershipId: ctx.ownerMembershipId }, select: { submittedAt: true } }))?.submittedAt ? (
        <Badge tone="green">Submitted</Badge>
      ) : (
        <Badge tone="amber">Not submitted</Badge>
      )
    ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={FORM_INFO[form].title}
        subtitle={
          <>
            {owner.user.name} · {team.name} · {team.labGroup.semester.name} {status}
            {!ctx.canEdit && <span className="ml-2 text-slate-500">(read-only)</span>}
          </>
        }
        actions={
          staffView ? (
            <MemberPicker members={teammates} current={ctx.ownerMembershipId} />
          ) : (
            <Link href="/forms" className="text-sm text-blue-700 hover:underline">
              ← All forms
            </Link>
          )
        }
      />
      {body}
      <Card title="Comments">
        <CommentsPanel teamId={teamId} form={form} membershipId={ctx.ownerMembershipId} comments={comments} canComment={canComment(user, team)} />
      </Card>
      <p className="text-xs text-slate-500">
        {comments.length > 0 ? `Last comment ${dateFmt.format(new Date(comments.at(-1)!.createdAt))}. ` : ""}Entries keep who created and changed them, and when.
      </p>
    </div>
  );
}
