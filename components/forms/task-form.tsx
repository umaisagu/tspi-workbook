"use client";

import type { Phase } from "@/generated/prisma/enums";
import type { TaskRow } from "@/lib/server/forms/planning";
import { taskSchema } from "@/lib/schemas/forms";
import { phaseName } from "@/lib/tsp/phases";
import { estimatedHours } from "@/lib/tsp/earned-value";
import { Badge } from "@/components/ui/card";
import { LogTable, type Option } from "./log-table";
import { TaskComplete } from "./task-complete";
import { TASK_STATUSES, taskStatusLabel } from "@/lib/tsp/tasks";
import { SIZE_MEASURES as SIZE_MEASURE_LIST } from "@/lib/tsp/sizes";
import { none, phaseOptions } from "./options";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
export const SIZE_MEASURES: Option[] = SIZE_MEASURE_LIST.map((m) => ({ ...m }));

export function TaskForm({
  teamId,
  rows,
  canEdit,
  components,
  members,
  milestones,
  hiddenPhases,
  currentWeek,
  ownMembershipId,
}: {
  teamId: string;
  rows: TaskRow[];
  canEdit: boolean;
  components: Option[];
  members: Option[];
  milestones: Option[];
  hiddenPhases: Phase[];
  currentWeek: number;
  /** The viewer's membership: a member who is not the leader marks their own tasks done here. */
  ownMembershipId?: string;
}) {
  return (
    <LogTable<TaskRow & { week?: number }>
      rows={rows.map((r) => ({ ...r, week: r.planWeek ?? undefined }))}
      canEdit={canEdit}
      schema={taskSchema}
      createUrl={`/api/teams/${teamId}/tasks`}
      rowUrl={(id) => `/api/teams/${teamId}/tasks/${id}`}
      addLabel="Add task"
      emptyText="No tasks yet. List the work for this cycle: one row per phase of each component, with the hours you plan."
      phaseOf={(r) => r.phase}
      phaseLabel={(p) => `${p} – ${phaseName(p as Phase)}`}
      fields={[
        { name: "code", label: "Task ID", type: "text", hint: "Leave empty for the next T-number" },
        { name: "name", label: "Task", type: "text", wide: true },
        { name: "milestoneId", label: "Milestone", type: "select", options: [none(), ...milestones] },
        { name: "phase", label: "Phase", type: "select", options: phaseOptions(() => true, hiddenPhases) },
        { name: "order", label: "Order", type: "number", hint: "Plan sequence" },
        { name: "componentId", label: "Component", type: "select", options: [none(), ...components] },
        { name: "assigneeMembershipId", label: "Assigned to", type: "select", options: [none("Unassigned"), ...members] },
        { name: "planHours", label: "Plan hours", type: "number", hint: "Leave empty to use size ÷ rate" },
        { name: "planWeek", label: "Plan week", type: "number", hint: "Leave empty to take it from SCHEDULE" },
        { name: "status", label: "Status", type: "select", options: TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
        { name: "completedOn", label: "Completed on", type: "date", hint: "Required when Complete; earned value counts in its week" },
        { name: "estSize", label: "Estimated size", type: "number" },
        { name: "sizeMeasure", label: "Size measure", type: "select", options: [none(), ...SIZE_MEASURES] },
        { name: "rate", label: "Rate (per hour)", type: "number" },
      ]}
      emptyValues={() => ({
        code: "",
        name: "",
        milestoneId: rows.at(-1)?.milestoneId ?? "",
        phase: rows.at(-1)?.phase ?? "PLAN",
        order: "",
        componentId: rows.at(-1)?.componentId ?? "",
        assigneeMembershipId: "",
        planHours: "",
        planWeek: "",
        status: "PLANNED",
        completedOn: "",
        estSize: "",
        sizeMeasure: "",
        rate: "",
      })}
      toValues={(r) => ({
        code: r.code ?? "",
        name: r.name,
        milestoneId: r.milestoneId ?? "",
        phase: r.phase,
        order: String(r.order),
        componentId: r.componentId ?? "",
        assigneeMembershipId: r.assigneeMembershipId ?? "",
        planHours: String(r.planHours),
        planWeek: r.planWeekTyped === null ? "" : String(r.planWeekTyped),
        status: r.status,
        completedOn: r.completedOn ?? "",
        estSize: r.estSize === null ? "" : String(r.estSize),
        sizeMeasure: r.sizeMeasure ?? "",
        rate: r.rate === null ? "" : String(r.rate),
      })}
      preview={(v) => {
        const est = estimatedHours(v.estSize ? Number(v.estSize) : null, v.rate ? Number(v.rate) : null);
        return est !== null ? <>Estimated hours (size ÷ rate): <strong>{est}</strong></> : null;
      }}
      columns={[
        { key: "code", label: "Task ID", render: (r) => <span className="whitespace-nowrap font-mono">{r.code ?? "—"}</span> },
        { key: "ms", label: "M/stone", render: (r) => r.milestoneCode ?? "—" },
        { key: "name", label: "Task", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "phase", label: "Phase", render: (r) => <span title={phaseName(r.phase)}>{r.phase}</span> },
        { key: "component", label: "Component", render: (r) => r.componentName ?? "—" },
        { key: "who", label: "Assigned", render: (r) => r.assigneeName ?? "—" },
        { key: "plan", label: "Plan h", render: (r) => r.planHours, className: "text-right" },
        { key: "pv", label: "PV", render: (r) => pct(r.planValue), className: "text-right" },
        { key: "cumpv", label: "Cum PV", render: (r) => pct(r.cumPlanValue), className: "text-right" },
        {
          key: "pw",
          label: "Plan wk",
          render: (r) =>
            r.planWeek === null ? (
              <Badge tone="red">Unscheduled</Badge>
            ) : (
              <span title={r.planWeekTyped === null ? "From SCHEDULE" : "Typed on TASK"}>{r.planWeek}</span>
            ),
          className: "text-right",
        },
        { key: "actual", label: "Actual h", render: (r) => r.actualHours, className: "text-right" },
        {
          key: "done",
          label: "Status",
          render: (r) =>
            !canEdit && ownMembershipId && r.assigneeMembershipId === ownMembershipId ? (
              <TaskComplete teamId={teamId} taskId={r.id} status={r.status} completedOn={r.completedOn} taskName={r.name} />
            ) : (
              <span className="whitespace-nowrap">
                <Badge tone={r.status === "COMPLETE" ? "green" : r.status === "IN_PROGRESS" ? "blue" : "slate"}>{taskStatusLabel(r.status)}</Badge>
                {r.completedOn && <span className="ml-1 text-xs text-slate-600">{r.completedOn}</span>}
              </span>
            ),
        },
        { key: "aw", label: "Actual wk", render: (r) => r.completedWeek ?? "—", className: "text-right" },
        {
          key: "ev",
          label: "EV",
          render: (r) =>
            r.completedOn ? (
              pct(r.earnedValue)
            ) : r.planWeek !== null && r.planWeek < currentWeek ? (
              <Badge tone="amber">Overdue</Badge>
            ) : (
              "—"
            ),
          className: "text-right",
        },
      ]}
      footer={(visible) => (
        <tr className="font-medium">
          <td colSpan={6} className="px-2 py-2 text-right">
            {visible.length} tasks
          </td>
          <td className="px-2 py-2 text-right">{Math.round(visible.reduce((s, r) => s + r.planHours, 0) * 100) / 100}</td>
          <td className="px-2 py-2 text-right">{pct(visible.reduce((s, r) => s + r.planValue, 0))}</td>
          <td colSpan={2} />
          <td className="px-2 py-2 text-right">{Math.round(visible.reduce((s, r) => s + r.actualHours, 0) * 100) / 100}</td>
          <td colSpan={2} />
          <td className="px-2 py-2 text-right">{pct(visible.reduce((s, r) => s + r.earnedValue, 0))}</td>
        </tr>
      )}
    />
  );
}
