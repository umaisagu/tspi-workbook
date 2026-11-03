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
  DEFERRED: { label: "Deferred", tone: "slate" },
  IMPLEMENTED: { label: "Implemented", tone: "slate" },
};
/** Workbook v3.0 change types (LISTS Change Type). */
const CHANGE_TYPES: Option[] = [
  { value: "REQUIREMENT", label: "Requirement" },
  { value: "DESIGN", label: "Design" },
  { value: "CODE", label: "Code" },
  { value: "TEST", label: "Test" },
  { value: "DOCUMENT", label: "Document" },
  { value: "BUILD_CI", label: "Build / CI" },
];
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
  milestones,
  members,
}: {
  teamId: string;
  rows: ChangeRequestRow[];
  canAdd: boolean;
  editableIds: string[];
  canDecide: boolean;
  components: Option[];
  milestones: Option[];
  members: Option[];
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
        { name: "changeType", label: "Change type", type: "select", options: [none(), ...CHANGE_TYPES] },
        { name: "componentId", label: "Component", type: "select", options: [none(), ...components] },
        { name: "estHours", label: "Est. hours", type: "number", hint: "Approved changes add these hours to the plan" },
        { name: "milestoneId", label: "Milestone", type: "select", options: [none(), ...milestones] },
        { name: "reviewerMembershipId", label: "Reviewer", type: "select", options: [none(), ...members] },
        { name: "priority", label: "Priority", type: "select", options: PRIORITY },
        ...(canDecide
          ? [{ name: "status", label: "Status (Team Leader)", type: "select" as const, options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })) }]
          : []),
        { name: "description", label: "What changes", type: "textarea" },
        { name: "reason", label: "Why: whose need does this serve", type: "textarea" },
        { name: "impact", label: "Impact (requirements, design, schedule, tests)", type: "textarea" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      emptyValues={() => ({
        date: todayString(),
        changeType: "",
        estHours: "",
        milestoneId: "",
        reviewerMembershipId: "",
        notes: "",
        priority: "MEDIUM",
        componentId: "",
        status: "SUBMITTED",
        description: "",
        reason: "",
        impact: "",
      })}
      toValues={(r) => ({
        date: r.date,
        priority: r.priority,
        componentId: r.componentId ?? "",
        status: r.status,
        description: r.description,
        reason: r.reason,
        impact: r.impact ?? "",
        changeType: r.changeType ?? "",
        estHours: r.estHours === null ? "" : String(r.estHours),
        milestoneId: r.milestoneId ?? "",
        reviewerMembershipId: r.reviewerMembershipId ?? "",
        notes: r.notes ?? "",
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
          <div>
            <dt className="text-xs font-medium text-slate-500">Notes</dt>
            <dd className="whitespace-pre-wrap">{r.notes ?? "—"}</dd>
          </div>
        </dl>
      )}
      columns={[
        { key: "no", label: "CCR", render: (r) => <span className="font-mono">CCR-{String(r.number).padStart(2, "0")}</span> },
        { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
        { key: "by", label: "Raised by", render: (r) => r.requesterName },
        { key: "type", label: "Type", render: (r) => CHANGE_TYPES.find((t) => t.value === r.changeType)?.label ?? "—" },
        { key: "comp", label: "Component", render: (r) => r.componentName ?? "—" },
        { key: "desc", label: "What changes", render: (r) => <span className="line-clamp-2 max-w-sm">{r.description}</span> },
        { key: "hrs", label: "Est. h", render: (r) => r.estHours ?? "—", className: "text-right" },
        { key: "ms", label: "M/stone", render: (r) => r.milestoneCode ?? "—" },
        { key: "rev", label: "Reviewer", render: (r) => r.reviewerName ?? "—" },
        { key: "status", label: "Status", render: (r) => <Badge tone={STATUS[r.status]!.tone}>{STATUS[r.status]!.label}</Badge> },
        { key: "decided", label: "Decided on", render: (r) => (r.decidedByName ? `${r.decidedByName}, ${r.decidedAt!.slice(0, 10)}` : "—") },
      ]}
      footer={(visible) => {
        const approved = visible.filter((r) => r.status === "APPROVED" || r.status === "IMPLEMENTED");
        return (
          <tr className="font-medium">
            <td colSpan={11} className="px-2 py-2 text-right">
              {visible.length} requests · {approved.length} approved · added hours {approved.reduce((s, r) => s + (r.estHours ?? 0), 0)}
            </td>
          </tr>
        );
      }}
    />
  );
}
