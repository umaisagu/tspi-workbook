import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  activeMembershipIn,
  canAddTeamRow,
  canComment,
  canDecideChange,
  canEditOwnTeamRow,
  canEditScheduleRow,
  canEditTaskPlan,
  canEditTeamForms,
  canReadTeamForms,
  isStaff,
} from "@/lib/auth/permissions";
import { listChangeRequests, listTests, loadPeer, loadWeekReports } from "@/lib/server/forms/team-forms";
import { LogtestForm } from "@/components/forms/logtest-form";
import { CcrForm } from "@/components/forms/ccr-form";
import { WeekForm } from "@/components/forms/week-form";
import { PeerForm } from "@/components/forms/peer-form";
import type { FormType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/server/viewer";
import { loadPlanning } from "@/lib/server/forms/planning";
import { TaskForm } from "@/components/forms/task-form";
import { ScheduleForm } from "@/components/forms/schedule-form";
import { SumTaskView } from "@/components/forms/sumtask-view";
import { SumsForm } from "@/components/forms/sums-form";
import { SumpView } from "@/components/forms/sump-view";
import { SumqView } from "@/components/forms/sumq-view";
import { ScopePicker } from "@/components/forms/scope-picker";
import { QualityPlanEditor } from "@/components/forms/quality-plan-editor";
import { loadSumpSumq, loadSums } from "@/lib/server/forms/quality";
import { PlanningCharts } from "@/components/charts/planning-charts";
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
  const form = formFromSlug(slug);
  if (!form || !AVAILABLE_FORMS.includes(form)) notFound();

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { labGroup: { include: { semester: true } } },
  });
  if (!team) notFound();
  const sp = await searchParams;
  if (!FORM_INFO[form].individual) {
    return (
      <TeamFormPage
        user={user}
        team={team}
        form={form}
        component={typeof sp.component === "string" ? sp.component : null}
        weekParam={typeof sp.week === "string" && /^\d+$/.test(sp.week) ? Number(sp.week) : null}
      />
    );
  }
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
  const comments = form === "PEER" ? [] : await listComments(teamId, form, ctx.ownerMembershipId);
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
  } else if (form === "PEER") {
    const peer = await loadPeer(teamId, ctx.ownerMembershipId);
    const requested = typeof sp.milestone === "string" ? sp.milestone : null;
    // default: the next milestone not yet due, else the last one
    const milestoneId = peer.milestones.find((m) => m.id === requested)?.id ?? peer.milestones.find((m) => !m.pastDue)?.id ?? peer.milestones.at(-1)?.id;
    body = milestoneId ? (
      <PeerForm key={milestoneId} teamId={teamId} data={peer} canEdit={ctx.canEdit} milestoneId={milestoneId} memberQuery={staffView ? `&member=${ctx.ownerMembershipId}` : ""} />
    ) : (
      <Alert kind="info">No milestone collects PEER evaluations.</Alert>
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
      {form !== "PEER" && (
        <Card title="Comments">
          <CommentsPanel teamId={teamId} form={form} membershipId={ctx.ownerMembershipId} comments={comments} canComment={canComment(user, team)} />
        </Card>
      )}
      <p className="text-xs text-slate-500">
        {comments.length > 0 ? `Last comment ${dateFmt.format(new Date(comments.at(-1)!.createdAt))}. ` : ""}Entries keep who created and changed them, and when.
      </p>
    </div>
  );
}

type TeamWithSemester = Prisma.TeamGetPayload<{ include: { labGroup: { include: { semester: true } } } }>;

/** Team-level forms: TASK, SCHEDULE, SUMTASK (read by the team and its staff; edited by the Team Leader; TASK also by the Planning Manager). */
async function TeamFormPage({
  user,
  team,
  form,
  component,
  weekParam,
}: {
  user: CurrentUser;
  team: TeamWithSemester;
  form: FormType;
  component: string | null;
  weekParam: number | null;
}) {
  if (!canReadTeamForms(user, team)) notFound();
  const [planning, comments, components, teammates] = await Promise.all([
    loadPlanning(team.id),
    listComments(team.id, form, null),
    listComponents(team.id),
    listTeammates(team.id),
  ]);
  const canEdit = canEditTeamForms(user, team);
  let body: React.ReactNode;
  if (form === "TASK") {
    body = (
      <TaskForm
        teamId={team.id}
        rows={planning.tasks}
        canEdit={canEditTaskPlan(user, team)}
        currentWeek={planning.currentWeek}
        ownMembershipId={activeMembershipIn(user, team.id)?.membershipId}
        hiddenPhases={planning.semester.hiddenPhases}
        components={components.map((c) => ({ value: c.id, label: c.name }))}
        members={teammates.map((t) => ({ value: t.membershipId, label: t.name }))}
      />
    );
  } else if (form === "SCHEDULE") {
    body = (
      <div className="space-y-6">
        <Card>
          <PlanningCharts weeks={planning.schedule.weeks} currentWeek={planning.currentWeek} />
        </Card>
        <ScheduleForm
          teamId={team.id}
          planning={planning}
          editableMemberIds={planning.scheduleGrid.filter((r) => r.active && canEditScheduleRow(user, team, r.membershipId)).map((r) => r.membershipId)}
        />
      </div>
    );
  } else if (form === "SUMTASK") {
    body = <SumTaskView data={planning.sumtask} />;
  } else if (form === "LOGTEST") {
    const rows = await listTests(team.id, team.labGroup.semester.week1Monday);
    body = (
      <LogtestForm
        teamId={team.id}
        rows={rows}
        canAdd={canAddTeamRow(user, team)}
        editableIds={rows.filter((r) => canEditOwnTeamRow(user, team, r.authorMembershipId)).map((r) => r.id)}
        isLeader={canEditTeamForms(user, team)}
        members={teammates.map((t) => ({ value: t.membershipId, label: t.name }))}
      />
    );
  } else if (form === "CCR") {
    const rows = await listChangeRequests(team.id);
    const leader = canDecideChange(user, team);
    body = (
      <CcrForm
        teamId={team.id}
        rows={rows}
        canAdd={canAddTeamRow(user, team)}
        canDecide={leader}
        editableIds={rows.filter((r) => leader || (canEditOwnTeamRow(user, team, r.requesterMembershipId) && r.status === "SUBMITTED")).map((r) => r.id)}
        components={components.map((c) => ({ value: c.id, label: c.name }))}
      />
    );
  } else if (form === "WEEK") {
    const w = await loadWeekReports(team.id, weekParam);
    body = <WeekForm key={w.week ?? "none"} teamId={team.id} list={w.list} week={w.week} report={w.report} live={w.live} canEdit={canEdit} />;
  } else if (form === "SUMS") {
    const sums = await loadSums(team.id);
    body = (
      <div className="space-y-3">
        <SumsForm teamId={team.id} rows={sums.rows} canEdit={canEdit} />
        <p className="text-xs text-slate-500">
          B/D/M/A/R = base, deleted, modified, added, reused. N&amp;C = modified + added; Total = base − deleted + added + reused. Not linked to a
          component: {sums.unassigned.hours} h logged, {sums.unassigned.defects} defects. Components are added on the Team page.
        </p>
      </div>
    );
  } else {
    const q = await loadSumpSumq(team.id, component);
    body = (
      <div className="space-y-5">
        <ScopePicker scopes={q.scopes} current={q.scope} />
        {form === "SUMP" ? (
          <SumpView sump={q.sump} />
        ) : (
          <>
            <SumqView sumq={q.sumq} isSystem={q.scope === null} />
            <Card title="Quality plan (inputs)">
              <QualityPlanEditor teamId={team.id} rates={q.planInjectionRate} yields={q.planYield} usingDefaults={q.usingDefaults} canEdit={canEdit} />
            </Card>
          </>
        )}
      </div>
    );
  }
  const readOnly =
    form === "SUMTASK"
      ? "computed from TASK and LOGT"
      : form === "SUMP"
        ? "computed"
        : form === "SCHEDULE" || form === "LOGTEST" || form === "CCR"
          ? null
          : !canEdit
            ? "read-only"
            : null;
  return (
    <div className="space-y-5">
      <PageHeader
        title={FORM_INFO[form].title}
        subtitle={
          <>
            {team.name} · {team.labGroup.semester.name} · week {planning.currentWeek}
            {readOnly && <span className="ml-2 text-slate-500">({readOnly})</span>}
          </>
        }
        actions={
          isStaff(user) ? undefined : (
            <Link href="/forms" className="text-sm text-blue-700 hover:underline">
              ← All forms
            </Link>
          )
        }
      />
      {body}
      <Card title="Comments">
        <CommentsPanel teamId={team.id} form={form} membershipId={null} comments={comments} canComment={canComment(user, team)} />
      </Card>
    </div>
  );
}
