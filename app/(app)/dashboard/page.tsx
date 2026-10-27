import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { isTeamLeaderOf } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/server/viewer";
import { currentTeamFor } from "@/lib/server/teams";
import { loadTeamStatus } from "@/lib/server/team-status";
import { loadWeekReports } from "@/lib/server/forms/team-forms";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { StatusBadge } from "@/components/forms/status-badge";
import { num, pct } from "@/components/forms/format";
import { FORM_INFO } from "@/lib/forms";
import { CONTRIBUTION_MEASURES } from "@/lib/tsp/contribution";
import { roleLabel } from "@/lib/tsp/roles";
import { phaseName } from "@/lib/tsp/phases";

export const metadata: Metadata = { title: "Dashboard" };

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

export default async function DashboardPage() {
  const user = await requirePageUser();
  const current = await currentTeamFor(user);
  if (!current) {
    return (
      <>
        <PageHeader title={`Hello, ${user.name}`} />
        <Alert kind="info">You are not in a team yet. Your lecturer will add you to a team after Lab 01.</Alert>
      </>
    );
  }
  const { team, membership } = current;
  const me = membership.membershipId;
  const s = await loadTeamStatus(team.id);
  const { planning } = s;
  const week = planning.currentWeek;
  const [reviewsWaiting, weekReports] = await Promise.all([
    db.aiLog.count({ where: { reviewerMembershipId: me, approved: false, deletedAt: null } }),
    isTeamLeaderOf(user, team.id) ? loadWeekReports(team.id, null) : Promise.resolve(null),
  ]);

  const myHoursThisWeek = planning.memberWeekHours.filter((h) => h.memberId === me && h.week === week).reduce((x, h) => x + h.hours, 0);
  const myPlanThisWeek = planning.scheduleByMember.get(me)?.get(week) ?? 0;
  const myOpen = planning.tasks
    .filter((t) => t.assigneeMembershipId === me && !t.completedOn)
    .sort((a, b) => (a.planWeek ?? 99) - (b.planWeek ?? 99));

  // Forms due: my forms for the current milestone that are not done, team forms if I lead, reviews waiting.
  const due: { label: string; href: string; status: string; note?: string }[] = [];
  if (s.current) {
    const mine = s.current.result.members.find((m) => m.memberId === me);
    for (const f of mine?.forms ?? []) {
      if (f.status === "missing" || f.status === "pending") {
        due.push({ label: FORM_INFO[f.form].title, href: `/t/${team.id}/forms/${FORM_INFO[f.form].slug}`, status: f.status, note: `${s.current.code}, due ${dateFmt.format(new Date(s.current.dueAt))}` });
      }
    }
  }
  if (weekReports) {
    for (const w of weekReports.list.filter((l) => l.status === "missing" || l.status === "open")) {
      due.push({ label: `WEEK report, week ${w.week}`, href: `/t/${team.id}/forms/week?week=${w.week}`, status: w.status, note: `due ${dateFmt.format(new Date(w.dueAt))}` });
    }
  }
  if (reviewsWaiting > 0) due.push({ label: `${reviewsWaiting} LOGAI ${reviewsWaiting === 1 ? "entry" : "entries"} to review`, href: `/t/${team.id}/forms/logai`, status: "open" });

  const mineC = s.contributions.members.find((m) => m.memberId === me);
  const semester = team.labGroup.semester;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hello, ${user.name}`}
        subtitle={
          <>
            {team.name} · {team.labGroup.name} · {semester.name} · week {week}
            {semester.breakWeeks.includes(week) ? " (break)" : ""} · {membership.roles.map(roleLabel).join(", ") || "no TSPi role yet"}
          </>
        }
        actions={
          <Link href={`/t/${team.id}`} className="text-sm text-blue-700 hover:underline">
            Team dashboard →
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">My hours this week</div>
          <div className="text-2xl font-semibold">{num(myHoursThisWeek)} h</div>
          <div className="text-xs text-slate-500">planned {num(myPlanThisWeek)} h · <Link href={`/t/${team.id}/forms/logt`} className="text-blue-700 hover:underline">LOGT</Link></div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">My open tasks</div>
          <div className="text-2xl font-semibold">{myOpen.length}</div>
          <div className="text-xs text-slate-500">{myOpen.filter((t) => t.planWeek !== null && t.planWeek < week).length} overdue</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Forms to do</div>
          <div className="text-2xl font-semibold">{due.length}</div>
          <div className="text-xs text-slate-500">{due.filter((d) => d.status === "missing").length} past due</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Forms to do">
          {due.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing due right now.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {due.map((d) => (
                <li key={d.label} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={d.href} className="text-blue-700 hover:underline">
                    {d.label}
                  </Link>
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    {d.note} <StatusBadge status={d.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="My open tasks" actions={<Link href={`/t/${team.id}/forms/task`} className="text-sm text-blue-700 hover:underline">TASK</Link>}>
          {myOpen.length === 0 ? (
            <p className="text-sm text-slate-600">No open tasks assigned to you.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {myOpen.slice(0, 8).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {t.name} <span className="text-xs text-slate-500" title={phaseName(t.phase)}>{t.phase}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    {t.planWeek ? `week ${t.planWeek}` : "unscheduled"} · {num(t.actualHours)} / {num(t.planHours)} h
                    {t.planWeek !== null && t.planWeek < week && <Badge tone="amber">Overdue</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {mineC && (
        <Card title="My contribution" actions={<span className="text-xs text-slate-500">Fair share in a team of {s.members.length}: {pct(s.contributions.fairShare, 0)}</span>}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 text-left font-medium">Measure</th>
                  <th className="px-2 py-2 text-right font-medium">Me</th>
                  <th className="px-2 py-2 text-right font-medium">Team average</th>
                  <th className="px-2 py-2 text-right font-medium">My share of team</th>
                </tr>
              </thead>
              <tbody>
                {CONTRIBUTION_MEASURES.map((m) => (
                  <tr key={m.key} className="border-b border-slate-100">
                    <td className="px-2 py-1">{m.label}</td>
                    <td className="px-2 py-1 text-right font-medium">
                      {num(mineC.values[m.key])}
                      {m.unit}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {num(s.contributions.average[m.key])}
                      {m.unit}
                    </td>
                    <td className="px-2 py-1 text-right">{pct(mineC.shares[m.key], 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Counted from your LOGT, TASK, LOGD, LOGAI and LOGTEST records. Last 3 weeks = weeks {Math.max(week - 2, 1)}–{week}.</p>
        </Card>
      )}
    </div>
  );
}
