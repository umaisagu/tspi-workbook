import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canViewMonitoring, isLecturer } from "@/lib/auth/permissions";
import { FLAG_ORDER, loadTeamMonitoring } from "@/lib/server/monitoring";
import { requireStaffPage } from "@/lib/server/page-guards";
import { Card, PageHeader } from "@/components/ui/card";
import { PlanningCharts } from "@/components/charts/planning-charts";
import { TeamStatusBadge } from "@/components/monitor/team-status-badge";
import { ContributionTable } from "@/components/monitor/contribution-table";
import { Heatmap, WeeklyCompletion } from "@/components/monitor/heatmap";
import { FlagList } from "@/components/monitor/flag-list";
import { NotesPanel } from "@/components/monitor/notes-panel";
import { ExportPanel } from "@/components/monitor/export-panel";
import { ActionButton } from "@/components/admin/action-button";
import { CompletionGrid } from "@/components/dashboard/completion-grid";
import { pct } from "@/components/forms/format";

export const metadata: Metadata = { title: "Team detail" };

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

export default async function TeamMonitorPage({ params }: PageProps<"/monitor/teams/[teamId]">) {
  const user = await requireStaffPage();
  const { teamId } = await params;
  const team = await db.team.findUnique({ where: { id: teamId }, include: { labGroup: { include: { semester: true } }, githubSync: true } });
  if (!team || !canViewMonitoring(user, team.labGroupId)) notFound();
  const m = await loadTeamMonitoring(teamId, user);
  const lecturer = isLecturer(user);
  const now = m.planning.schedule.weeks.find((w) => w.week === m.planning.currentWeek);
  const flags = [...m.flags].sort((a, b) => Number(a.status !== "OPEN") - Number(b.status !== "OPEN") || FLAG_ORDER.indexOf(a.type) - FLAG_ORDER.indexOf(b.type));
  const names = Object.fromEntries(m.members.map((x) => [x.id, x.name]));
  const milestones = await db.milestone.findMany({ where: { semesterId: team.labGroup.semesterId }, orderBy: { dueAt: "asc" }, select: { id: true, code: true } });

  return (
    <div className="space-y-5">
      <PageHeader
        title={team.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {team.labGroup.name} · week {m.planning.currentWeek} · <TeamStatusBadge status={m.status.status} reasons={m.status.reasons} />
            {m.status.reasons.length > 0 && <span className="text-slate-500">{m.status.reasons.join(" · ")}</span>}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/monitor" className="text-blue-700 hover:underline">
              ← Class overview
            </Link>
            <Link href={`/t/${teamId}`} className="text-blue-700 hover:underline">
              Team dashboard
            </Link>
            <Link href={`/t/${teamId}/forms/task`} className="text-blue-700 hover:underline">
              Forms
            </Link>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Earned vs planned value", `${pct(now?.cumEarnedValue ?? 0)} / ${pct(now?.cumPlannedValue ?? 0)}`],
          ["Hours actual / planned", `${Math.round(now?.cumActualHours ?? 0)} / ${Math.round(now?.cumPlanHours ?? 0)} h`],
          ["Current milestone forms", m.current ? `${m.current.code}: ${pct(m.current.result.percent, 0)}` : "—"],
          ["Last activity", m.lastActivity ? `${m.daysSinceActivity} d ago` : "never"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <Card>
        <PlanningCharts weeks={m.planning.schedule.weeks} currentWeek={m.planning.currentWeek} />
      </Card>
      <Card title="Contribution">
        <ContributionTable m={m} />
      </Card>
      <Card title={`Flags (${flags.filter((f) => f.status === "OPEN").length} open)`}>
        <FlagList flags={flags} canReview={lecturer} emptyText="No flags for this team." />
      </Card>
      <Card title="Hours by week">
        <Heatmap m={m} />
      </Card>
      <Card title="Form completion by week">
        <WeeklyCompletion m={m} />
      </Card>
      {m.current && (
        <Card title={`Form completion · ${m.current.code}`}>
          <CompletionGrid teamId={teamId} result={m.current.result} names={names} linkMembers />
        </Card>
      )}
      <Card
        title="GitHub"
        actions={lecturer && m.githubEnabled && <ActionButton url="/api/github/refresh" method="POST" body={{ teamId }} label="Refresh now" />}
      >
        <p className="text-sm text-slate-700">
          {!m.githubEnabled
            ? "GitHub is not connected (no GITHUB_TOKEN); commits, pull requests and reviews are not shown."
            : !team.repoUrl
              ? "No repository URL set for this team."
              : (
                  <>
                    Repository{" "}
                    <a href={team.repoUrl} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
                      {team.repoUrl.replace("https://github.com/", "")}
                    </a>
                    . {team.githubSync?.lastSyncedAt ? `Last refreshed ${dateFmt.format(team.githubSync.lastSyncedAt)}.` : "Not refreshed yet."}
                    {team.githubSync?.lastError && <span className="text-red-700"> Last attempt: {team.githubSync.lastError}.</span>}
                  </>
                )}
        </p>
      </Card>
      <Card title="Exports">
        <ExportPanel teamId={teamId} members={m.members.map((x) => ({ id: x.id, name: x.name }))} milestones={milestones} canContribution={lecturer} />
      </Card>
      {lecturer && (
        <Card title="Private notes">
          <NotesPanel teamId={teamId} members={m.members.map((x) => ({ id: x.id, name: x.name }))} notes={m.notes} />
        </Card>
      )}
    </div>
  );
}
