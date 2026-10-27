"use client";

import type { ChangeRequestRow } from "@/lib/server/forms/team-forms";
import { changeRequestSchema } from "@/lib/schemas/forms";
import { Badge } from "@/components/ui/card";
import { LogTable, type Option } from "./log-table";
import { none, todayString } from "./options";

const STATUS: Record<string, { label: string; tone: "blue" | "green" | "red" | "slate" }> = {
  SUBMITTED: { label: "Submitted", tone: "blue" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  IMPLEMENTED: { label: "Implemented", tone: "slate" },
};
const PRIORITY: Option[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

/** CCR: members raise change requests; the Team Leader decides them. */
export function CcrForm({
  teamId,
  rows,
  canAdd,
  editableIds,
  canDecide,
  components,
}: {
  teamId: string;
  rows: ChangeRequestRow[];
  canAdd: boolean;
  editableIds: string[];
  canDecide: boolean;
  components: Option[];
}) {
  return (
    <LogTable<ChangeRequestRow>
      rows={rows}
      canEdit={canAdd}
      canEditRow={(r) => editableIds.includes(r.id)}
      schema={changeRequestSchema}
      createUrl={`/api/teams/${teamId}/ccr`}
      rowUrl={(id) => `/api/teams/${teamId}/ccr/${id}`}
      addLabel="New change request"
      emptyText="No change requests. Raise one when a requirement, design or baseline item needs to change after it was agreed."
      phaseOf={(r) => r.status}
      phaseLabel={(s) => STATUS[s]?.label ?? s}
      filterLabel="Status"
      fields={[
        { name: "date", label: "Date", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: PRIORITY },
        { name: "componentId", label: "Component", type: "select", options: [none(), ...components] },
        ...(canDecide
          ? [{ name: "status", label: "Status (Team Leader)", type: "select" as const, options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })) }]
          : []),
        { name: "description", label: "Requested change", type: "textarea" },
        { name: "reason", label: "Reason", type: "textarea" },
        { name: "impact", label: "Impact (requirements, design, schedule, tests)", type: "textarea" },
      ]}
      emptyValues={() => ({ date: todayString(), priority: "MEDIUM", componentId: "", status: "SUBMITTED", description: "", reason: "", impact: "" })}
      toValues={(r) => ({
        date: r.date,
        priority: r.priority,
        componentId: r.componentId ?? "",
        status: r.status,
        description: r.description,
        reason: r.reason,
        impact: r.impact ?? "",
      })}
      expand={(r) => (
        <dl className="grid gap-3 md:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500">Requested change</dt>
            <dd className="whitespace-pre-wrap">{r.description}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Reason</dt>
            <dd className="whitespace-pre-wrap">{r.reason}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Impact</dt>
            <dd className="whitespace-pre-wrap">{r.impact ?? "—"}</dd>
          </div>
        </dl>
      )}
      columns={[
        { key: "no", label: "CCR", render: (r) => <span className="font-mono">CCR-{String(r.number).padStart(2, "0")}</span> },
        { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
        { key: "by", label: "Requested by", render: (r) => r.requesterName },
        { key: "comp", label: "Component", render: (r) => r.componentName ?? "—" },
        { key: "desc", label: "Change", render: (r) => <span className="line-clamp-2 max-w-sm">{r.description}</span> },
        { key: "prio", label: "Priority", render: (r) => PRIORITY.find((p) => p.value === r.priority)?.label },
        { key: "status", label: "Status", render: (r) => <Badge tone={STATUS[r.status]!.tone}>{STATUS[r.status]!.label}</Badge> },
        { key: "decided", label: "Decided", render: (r) => (r.decidedByName ? `${r.decidedByName}, ${r.decidedAt!.slice(0, 10)}` : "—") },
      ]}
    />
  );
}
