"use client";

import type { Phase } from "@/generated/prisma/enums";
import type { TimeLogRow } from "@/lib/server/forms/logs";
import { timeLogSchema } from "@/lib/schemas/forms";
import { phaseName } from "@/lib/tsp/phases";
import { minutesToHours, parseClock, timeEntryErrors, totalHours } from "@/lib/tsp/time";
import { LogTable, type FieldDef, type Option } from "./log-table";
import { none, phaseOptions, todayString } from "./options";

export function LogtForm({
  teamId,
  rows,
  canEdit,
  components,
  tasks,
  hiddenPhases,
}: {
  teamId: string;
  rows: TimeLogRow[];
  canEdit: boolean;
  components: Option[];
  tasks: Option[];
  hiddenPhases: Phase[];
}) {
  const fields: FieldDef[] = [
    { name: "date", label: "Date", type: "date" },
    { name: "start", label: "Start", type: "time" },
    { name: "stop", label: "Stop", type: "time" },
    { name: "interruptMin", label: "Interruption (min)", type: "number" },
    { name: "phase", label: "Phase", type: "select", options: phaseOptions((p) => p.logTime, hiddenPhases), wide: true },
    { name: "componentId", label: "Component", type: "select", options: [none(), ...components] },
    { name: "taskId", label: "Task", type: "select", options: [none(), ...tasks] },
    { name: "comments", label: "Comments", type: "textarea" },
  ];
  return (
    <LogTable<TimeLogRow>
      rows={rows}
      canEdit={canEdit}
      fields={fields}
      schema={timeLogSchema}
      createUrl={`/api/teams/${teamId}/logt`}
      rowUrl={(id) => `/api/teams/${teamId}/logt/${id}`}
      emptyValues={() => ({ date: todayString(), start: "", stop: "", interruptMin: "0", phase: rows.at(-1)?.phase ?? "PLAN", componentId: rows.at(-1)?.componentId ?? "", taskId: "", comments: "" })}
      toValues={(r) => ({
        date: r.date,
        start: r.start,
        stop: r.stop,
        interruptMin: String(r.interruptMin),
        phase: r.phase,
        componentId: r.componentId ?? "",
        taskId: r.taskId ?? "",
        comments: r.comments ?? "",
      })}
      phaseOf={(r) => r.phase}
      phaseLabel={(p) => `${p} – ${phaseName(p as Phase)}`}
      preview={(v) => {
        const start = parseClock(v.start ?? "");
        const stop = parseClock(v.stop ?? "");
        const interruptMin = Number(v.interruptMin || 0);
        if (start === null || stop === null || Object.keys(timeEntryErrors({ startMin: start, stopMin: stop, interruptMin })).length) return null;
        const delta = stop - start - interruptMin;
        return (
          <>
            Delta time: <strong>{delta} min</strong> ({minutesToHours(delta)} h)
          </>
        );
      }}
      columns={[
        { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
        { key: "week", label: "Wk", render: (r) => r.week },
        { key: "start", label: "Start", render: (r) => r.start },
        { key: "int", label: "Int.", render: (r) => r.interruptMin, className: "text-right" },
        { key: "stop", label: "Stop", render: (r) => r.stop },
        { key: "delta", label: "Delta", render: (r) => r.deltaMin, className: "text-right font-medium" },
        { key: "phase", label: "Phase", render: (r) => <span title={phaseName(r.phase)}>{r.phase}</span> },
        { key: "component", label: "Component", render: (r) => r.componentName ?? "—" },
        { key: "task", label: "Task", render: (r) => r.taskName ?? "—" },
        { key: "comments", label: "Comments", render: (r) => <span className="line-clamp-2 max-w-xs">{r.comments}</span> },
      ]}
      footer={(visible) => (
        <tr className="font-medium">
          <td colSpan={5} className="px-2 py-2 text-right">
            Total
          </td>
          <td className="px-2 py-2 text-right">{visible.reduce((s, r) => s + r.deltaMin, 0)} min</td>
          <td colSpan={4} className="px-2 py-2">
            = {totalHours(visible)} hours
          </td>
        </tr>
      )}
      emptyText="No time recorded yet. Log each work session: date, start, stop, interruptions, phase."
    />
  );
}
