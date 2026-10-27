import type { Metadata } from "next";
import Link from "next/link";
import { isStaff } from "@/lib/auth/permissions";
import { requireTeamPage } from "@/lib/server/team-page";
import { loadTeamStatus } from "@/lib/server/team-status";
import { Card, PageHeader } from "@/components/ui/card";
import { PlanningCharts } from "@/components/charts/planning-charts";
import { BarChart } from "@/components/charts/bar-chart";
import { SERIES_COLORS } from "@/components/charts/colors";
import { CompletionGrid } from "@/components/dashboard/completion-grid";
import { StatusBadge } from "@/components/forms/status-badge";
import { phaseName } from "@/lib/tsp/phases";
import { pct, num } from "@/components/forms/format";

export const metadata: Metadata = { title: "Team dashboard" };

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

export default async function TeamDashboard({ params }: PageProps<"/t/[teamId]">) {
  const { teamId } = await params;
  const { user, team } = await requireTeamPage(teamId);
  const s = await loadTeamStatus(teamId);
  const { planning } = s;
  const now = planning.schedule.weeks.find((w) => w.week === planning.currentWeek);
  const names = Object.fromEntries(s.members.map((m) => [m.id, m.name]));
  return (
    <div className="space-y-5">
      <PageHeader
        title={team.name}
        subtitle={`${team.labGroupName} · ${team.semesterName} · week ${planning.currentWeek}`}
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/t/${teamId}/milestones`} className="text-blue-700 hover:underline">
              Milestones
            </Link>
            <Link href={`/t/${teamId}/forms/schedule`} className="text-blue-700 hover:underline">
              SCHEDULE
            </Link>
            {!isStaff(user) && (
              <Link href="/team/roster" className="text-blue-700 hover:underline">
                Roster
              </Link>
            )}
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Earned value to date", pct(now?.cumEarnedValue ?? 0), `planned ${pct(now?.cumPlannedValue ?? 0)}`],
          ["Hours to date", `${num(now?.cumActualHours ?? 0)} h`, `planned ${num(now?.cumPlanHours ?? 0)} h`],
          ["Tasks completed", `${planning.sumtask.total.done} / ${planning.sumtask.total.tasks}`, `${planning.sumtask.total.overdue} overdue`],
          [
            "Predicted completion",
            planning.schedule.predictedCompletionWeek ? `Week ${planning.schedule.predictedCompletionWeek}` : "After week 15",
            "at the current earned-value rate",
          ],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-2xl font-semibold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </div>
      <Card>
        <PlanningCharts weeks={planning.schedule.weeks} currentWeek={planning.currentWeek} />
      </Card>
      <Card>
        <BarChart
          title="Defects by phase (LOGD)"
          categories={s.defectsByPhase.map((d) => d.phase)}
          categoryTitles={s.defectsByPhase.map((d) => phaseName(d.phase))}
          series={[
            { key: "inj", label: "Injected", color: SERIES_COLORS.blue, values: s.defectsByPhase.map((d) => d.injected) },
            { key: "rem", label: "Removed", color: SERIES_COLORS.orange, values: s.defectsByPhase.map((d) => d.removed) },
          ]}
        />
      </Card>
      {s.current && (
        <Card
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              Form completion · {s.current.code} {s.current.title} <StatusBadge status={s.current.result.status} />
            </span>
          }
          actions={<span className="text-sm text-slate-600">Due {dateFmt.format(new Date(s.current.dueAt))} · {Math.round(s.current.result.percent * 100)}% done</span>}
        >
          <CompletionGrid teamId={teamId} result={s.current.result} names={names} linkMembers={isStaff(user)} />
        </Card>
      )}
    </div>
  );
}
