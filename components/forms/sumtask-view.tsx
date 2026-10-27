import type { SumTaskGroup, SumTaskResult, TaskStatus } from "@/lib/tsp/sumtask";
import { Badge, Card } from "@/components/ui/card";
import { phaseName } from "@/lib/tsp/phases";
import type { Phase } from "@/generated/prisma/enums";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const STATUS: Record<TaskStatus, { label: string; tone: "green" | "red" | "blue" | "slate" }> = {
  done: { label: "Done", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
  in_progress: { label: "In progress", tone: "blue" },
  not_started: { label: "Not started", tone: "slate" },
};

function GroupTable({ title, groups, total, labelHeader }: { title: string; groups: SumTaskGroup[]; total: SumTaskGroup; labelHeader: string }) {
  return (
    <Card title={title}>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-right text-slate-600">
              <th className="px-2 py-2 text-left font-medium">{labelHeader}</th>
              {["Tasks", "Done", "Overdue", "Plan h", "Actual h", "CPI", "PV", "EV"].map((c) => (
                <th key={c} className="px-2 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...groups, total].map((g) => (
              <tr key={g.key} className={`border-b border-slate-100 text-right ${g.key === "total" ? "font-semibold" : ""}`}>
                <td className="px-2 py-1 text-left">{g.key !== "total" && labelHeader === "Phase" ? <span title={phaseName(g.key as Phase)}>{g.label}</span> : g.label}</td>
                <td className="px-2 py-1">{g.tasks}</td>
                <td className="px-2 py-1">{g.done}</td>
                <td className="px-2 py-1">{g.overdue || ""}</td>
                <td className="px-2 py-1">{g.planHours}</td>
                <td className="px-2 py-1">{g.actualHours}</td>
                <td className="px-2 py-1">{g.cpi ?? "—"}</td>
                <td className="px-2 py-1">{pct(g.plannedValue)}</td>
                <td className="px-2 py-1">{pct(g.earnedValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** SUMTASK: read-only task summary computed from TASK and LOGT. */
export function SumTaskView({ data }: { data: SumTaskResult }) {
  return (
    <div className="space-y-5">
      <Card title="Tasks">
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                {["Task", "Phase", "Assigned", "Plan h", "Actual h", "Deviation", "CPI", "Plan wk", "Done wk", "Late (wks)", "Status"].map((c, i) => (
                  <th key={c} className={`px-2 py-2 font-medium whitespace-nowrap ${i >= 3 ? "text-right" : "text-left"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-2 py-1">{r.name}</td>
                  <td className="px-2 py-1">{r.phase}</td>
                  <td className="px-2 py-1">{r.assigneeName ?? "—"}</td>
                  <td className="px-2 py-1 text-right">{r.planHours}</td>
                  <td className="px-2 py-1 text-right">{r.actualHours}</td>
                  <td className="px-2 py-1 text-right">
                    {r.deviationHours > 0 ? "+" : ""}
                    {r.deviationHours}
                    {r.deviationPct !== null ? ` (${r.deviationPct > 0 ? "+" : ""}${Math.round(r.deviationPct * 100)}%)` : ""}
                  </td>
                  <td className="px-2 py-1 text-right">{r.cpi ?? "—"}</td>
                  <td className="px-2 py-1 text-right">{r.planWeek ?? "—"}</td>
                  <td className="px-2 py-1 text-right">{r.completedWeek ?? "—"}</td>
                  <td className="px-2 py-1 text-right">{r.weeksLate || ""}</td>
                  <td className="px-2 py-1 text-right">
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-2 py-4 text-slate-500">
                    No tasks in the TASK plan yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Deviation = actual − plan hours; CPI = plan ÷ actual hours (above 1 means under plan).</p>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <GroupTable title="By member" groups={data.byMember} total={data.total} labelHeader="Member" />
        <GroupTable title="By phase" groups={data.byPhase} total={data.total} labelHeader="Phase" />
      </div>
      <GroupTable title="By component" groups={data.byComponent} total={data.total} labelHeader="Component" />
      <Card title="Time not linked to a task">
        <p className="mb-2 text-sm text-slate-600">LOGT hours with no task selected; they count toward SCHEDULE but not toward any task.</p>
        <ul className="text-sm">
          {data.unlinkedHours.map((u) => (
            <li key={u.memberId} className="flex justify-between border-b border-slate-100 py-1">
              <span>{u.memberName}</span>
              <span>{u.hours} h</span>
            </li>
          ))}
          <li className="flex justify-between py-1 font-semibold">
            <span>Total</span>
            <span>{data.unlinkedTotal} h</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
