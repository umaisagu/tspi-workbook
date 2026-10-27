"use client";

import type { TestRow } from "@/lib/server/forms/team-forms";
import { testLogSchema } from "@/lib/schemas/forms";
import { testSummary } from "@/lib/tsp/test-log";
import { Badge } from "@/components/ui/card";
import { LogTable, type Option } from "./log-table";
import { none, todayString } from "./options";

const STATUS: Record<string, { label: string; tone: "green" | "red" | "amber" | "slate" }> = {
  PASS: { label: "Pass", tone: "green" },
  FAIL: { label: "Fail", tone: "red" },
  BLOCKED: { label: "Blocked", tone: "amber" },
  NOT_RUN: { label: "Not run", tone: "slate" },
};
const TYPES: Option[] = [
  { value: "UNIT", label: "Unit" },
  { value: "WIDGET", label: "Widget" },
  { value: "INTEGRATION", label: "Integration" },
];

/** LOGTEST: every member records their own test cases; the Team Leader can edit any. */
export function LogtestForm({
  teamId,
  rows,
  canAdd,
  editableIds,
  isLeader,
  members,
}: {
  teamId: string;
  rows: TestRow[];
  canAdd: boolean;
  /** Rows the viewer may edit (own, or all for the Team Leader). */
  editableIds: string[];
  isLeader: boolean;
  members: Option[];
}) {
  const s = testSummary(rows);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">
        {s.total} test cases · {s.unit} unit · {s.widget} widget · {s.integration} integration · {s.pass} pass · {s.fail} fail · {s.notRun} not run
        {s.passRate !== null && ` · pass rate ${Math.round(s.passRate * 100)}% of executed`}
        <span className="text-slate-500"> (course target for M3: ≥ 50 test cases)</span>
      </p>
      <LogTable<TestRow>
        rows={rows}
        canEdit={canAdd}
        canEditRow={(r) => editableIds.includes(r.id)}
        schema={testLogSchema}
        createUrl={`/api/teams/${teamId}/logtest`}
        rowUrl={(id) => `/api/teams/${teamId}/logtest/${id}`}
        addLabel="Add test case"
        emptyText="No test cases yet. Record each unit, widget and integration test with its expected and actual result."
        phaseOf={(r) => r.type}
        phaseLabel={(t) => TYPES.find((o) => o.value === t)?.label ?? t}
        filterLabel="Type"
        fields={[
          { name: "testCode", label: "Test ID", type: "text", placeholder: "Leave empty for the next TC-nnn" },
          { name: "date", label: "Date", type: "date" },
          { name: "type", label: "Type", type: "select", options: TYPES },
          { name: "status", label: "Status", type: "select", options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })) },
          { name: "module", label: "Module / requirement ID", type: "text", wide: true },
          ...(isLeader ? [{ name: "authorMembershipId", label: "Author", type: "select" as const, options: [none("Me"), ...members], wide: true }] : []),
          { name: "description", label: "Description", type: "textarea" },
          { name: "expected", label: "Expected result", type: "textarea" },
          { name: "actual", label: "Actual result", type: "textarea" },
        ]}
        emptyValues={() => ({
          testCode: "",
          date: todayString(),
          type: rows.at(-1)?.type ?? "UNIT",
          status: "NOT_RUN",
          module: rows.at(-1)?.module ?? "",
          authorMembershipId: "",
          description: "",
          expected: "",
          actual: "",
        })}
        toValues={(r) => ({
          testCode: r.testCode,
          date: r.date,
          type: r.type,
          status: r.status,
          module: r.module,
          authorMembershipId: r.authorMembershipId,
          description: r.description,
          expected: r.expected,
          actual: r.actual ?? "",
        })}
        expand={(r) => (
          <dl className="grid gap-3 md:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-slate-500">Description</dt>
              <dd className="whitespace-pre-wrap">{r.description}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Expected</dt>
              <dd className="whitespace-pre-wrap">{r.expected}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Actual</dt>
              <dd className="whitespace-pre-wrap">{r.actual ?? "—"}</dd>
            </div>
          </dl>
        )}
        columns={[
          { key: "id", label: "Test ID", render: (r) => <span className="font-mono">{r.testCode}</span> },
          { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
          { key: "module", label: "Module", render: (r) => r.module },
          { key: "desc", label: "Description", render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span> },
          { key: "type", label: "Type", render: (r) => TYPES.find((t) => t.value === r.type)?.label },
          { key: "status", label: "Status", render: (r) => <Badge tone={STATUS[r.status]!.tone}>{STATUS[r.status]!.label}</Badge> },
          { key: "author", label: "Author", render: (r) => r.authorName },
        ]}
      />
    </div>
  );
}
