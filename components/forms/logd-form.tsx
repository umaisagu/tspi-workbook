"use client";

import type { Phase } from "@/generated/prisma/enums";
import type { DefectLogRow } from "@/lib/server/forms/logs";
import { defectLogSchema } from "@/lib/schemas/forms";
import { DEFECT_TYPES, defectTypeLabel } from "@/lib/tsp/defects";
import { phaseName } from "@/lib/tsp/phases";
import { LogTable, type FieldDef, type Option } from "./log-table";
import { YES_NO, none, phaseOptions, todayString } from "./options";

const SEVERITIES: Option[] = [
  { value: "CRITICAL", label: "Critical" },
  { value: "MAJOR", label: "Major" },
  { value: "MINOR", label: "Minor" },
  { value: "COSMETIC", label: "Cosmetic" },
];

export function LogdForm({
  teamId,
  rows,
  canEdit,
  components,
  hiddenPhases,
}: {
  teamId: string;
  rows: DefectLogRow[];
  canEdit: boolean;
  components: Option[];
  hiddenPhases: Phase[];
}) {
  const fields: FieldDef[] = [
    { name: "date", label: "Date", type: "date" },
    { name: "type", label: "Type", type: "select", options: DEFECT_TYPES.map((t) => ({ value: String(t.code), label: `${t.code} ${t.name}` })) },
    { name: "componentId", label: "Component", type: "select", options: [none(), ...components] },
    { name: "fixTimeMin", label: "Fix time (min)", type: "number" },
    { name: "severity", label: "Severity", type: "select", options: SEVERITIES },
    { name: "fromAi", label: "From AI code?", type: "select", options: YES_NO },
    { name: "phaseInjected", label: "Phase injected", type: "select", options: phaseOptions((p) => p.defectsInjected, hiddenPhases), wide: true },
    { name: "phaseRemoved", label: "Phase removed", type: "select", options: phaseOptions((p) => p.defectsRemoved, hiddenPhases), wide: true },
    {
      name: "fixRefId",
      label: "Fix ref. (defect no.)",
      type: "select",
      hint: "If this defect was injected while fixing another one",
      options: [none(), ...rows.map((r) => ({ value: r.id, label: `#${r.number} ${r.description.slice(0, 40)}` }))],
      wide: true,
    },
    { name: "fixReference", label: "Fix reference", type: "text", placeholder: "Commit or PR, e.g. PR#21", hint: "Empty while the defect is still open", wide: true },
    { name: "description", label: "Description & root cause", type: "textarea" },
  ];
  const last = rows.at(-1);
  return (
    <LogTable<DefectLogRow>
      rows={rows}
      canEdit={canEdit}
      fields={fields}
      schema={defectLogSchema}
      createUrl={`/api/teams/${teamId}/logd`}
      rowUrl={(id) => `/api/teams/${teamId}/logd/${id}`}
      emptyValues={() => ({
        date: todayString(),
        type: String(last?.type ?? 80),
        componentId: last?.componentId ?? "",
        phaseInjected: last?.phaseInjected ?? "CODE",
        phaseRemoved: last?.phaseRemoved ?? "UT",
        fixTimeMin: "",
        fixRefId: "",
        severity: "MINOR",
        fromAi: "no",
        fixReference: "",
        description: "",
      })}
      toValues={(r) => ({
        date: r.date,
        type: String(r.type),
        componentId: r.componentId ?? "",
        phaseInjected: r.phaseInjected,
        phaseRemoved: r.phaseRemoved,
        fixTimeMin: String(r.fixTimeMin),
        fixRefId: r.fixRefId ?? "",
        severity: r.severity,
        fromAi: r.fromAi ? "yes" : "no",
        fixReference: r.fixReference ?? "",
        description: r.description,
      })}
      phaseOf={(r) => r.phaseRemoved}
      phaseLabel={(p) => `Removed in ${p} – ${phaseName(p as Phase)}`}
      addLabel="Add defect"
      columns={[
        { key: "num", label: "No.", render: (r) => r.number, className: "text-right" },
        { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
        { key: "week", label: "Wk", render: (r) => r.week },
        { key: "type", label: "Type", render: (r) => defectTypeLabel(r.type) },
        { key: "component", label: "Component", render: (r) => r.componentName ?? "—" },
        { key: "inj", label: "Injected", render: (r) => <span title={phaseName(r.phaseInjected)}>{r.phaseInjected}</span> },
        { key: "rem", label: "Removed", render: (r) => <span title={phaseName(r.phaseRemoved)}>{r.phaseRemoved}</span> },
        { key: "sev", label: "Severity", render: (r) => SEVERITIES.find((s) => s.value === r.severity)?.label },
        { key: "ai", label: "AI?", render: (r) => (r.fromAi ? "Yes" : "No") },
        { key: "fix", label: "Fix time", render: (r) => `${r.fixTimeMin} min`, className: "text-right whitespace-nowrap" },
        {
          key: "ref",
          label: "Fix ref.",
          render: (r) => (
            <span className="whitespace-nowrap">
              {r.fixReference ?? <span className="text-amber-700">open</span>}
              {r.fixRefNumber ? ` · from #${r.fixRefNumber}` : ""}
            </span>
          ),
        },
        { key: "desc", label: "Description", render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span> },
      ]}
      footer={(visible) => (
        <tr className="font-medium">
          <td colSpan={9} className="px-2 py-2 text-right">
            {visible.length} defects · total fix time
          </td>
          <td className="px-2 py-2 text-right">{visible.reduce((s, r) => s + r.fixTimeMin, 0)} min</td>
          <td colSpan={2} />
        </tr>
      )}
      emptyText="No defects recorded yet."
    />
  );
}
