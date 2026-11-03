"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiLogRow } from "@/lib/server/forms/logs";
import { aiLogSchema } from "@/lib/schemas/forms";
import { AI_TOOLS, AI_VERDICTS, isApprovedVerdict, keepRate, verdictLabel, type AiVerdict } from "@/lib/tsp/ai-log";
import { Badge } from "@/components/ui/card";
import { Select, sendJson } from "@/components/ui/form";
import { LogTable, type FieldDef, type Option } from "./log-table";
import { YES_NO, none, todayString } from "./options";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const TEST_STATUS: Option[] = [
  { value: "NOT_RUN", label: "Not run" },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
];
const testStatusLabel = (s: string | null) => TEST_STATUS.find((o) => o.value === s)?.label ?? "—";

function Details({ r }: { r: AiLogRow }) {
  const items: [string, string | null][] = [
    ["Prompt (summarised)", r.promptSpec],
    ["Tests written / status", `${r.testsWritten ? "Yes" : "No"} · ${testStatusLabel(r.testStatus)}`],
    ["Commit / PR", r.commitRef ?? r.prUrl],
    // Entries made before Workbook v3.0 keep their original notes.
    ["Model (before v3.0)", r.model],
    ["Output summary (before v3.0)", r.outputSummary],
    ["Human refinement (before v3.0)", r.humanRefinement],
    ["Test evidence (before v3.0)", r.testEvidence],
  ];
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {items
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function VerdictBadge({ r }: { r: AiLogRow }) {
  if (!r.reviewerMembershipId) return <Badge tone="red">No reviewer</Badge>;
  const tone = isApprovedVerdict(r.verdict) ? "green" : r.verdict === "PENDING" ? "amber" : "red";
  return <Badge tone={tone}>{r.verdict === "PENDING" ? "Awaiting review" : verdictLabel(r.verdict)}</Badge>;
}

export function LogaiForm({ teamId, rows, canEdit, teammates }: { teamId: string; rows: AiLogRow[]; canEdit: boolean; teammates: Option[] }) {
  // v3.0 tool list, plus any tool named in entries made before it (so editing an old entry keeps its value).
  const toolOptions = [...new Set<string>([...AI_TOOLS, ...rows.map((r) => r.tool)])].map((t) => ({ value: t, label: t }));
  const fields: FieldDef[] = [
    { name: "date", label: "Date", type: "date" },
    { name: "module", label: "File / module", type: "text", placeholder: "order_form.dart" },
    { name: "feature", label: "Feature or behaviour", type: "text", wide: true },
    { name: "tool", label: "AI tool", type: "select", options: toolOptions },
    { name: "linesGenerated", label: "Lines generated", type: "number" },
    { name: "linesKept", label: "Lines kept after review", type: "number" },
    { name: "reviewerMembershipId", label: "Reviewer (a teammate, not you)", type: "select", options: [none("Not yet chosen"), ...teammates] },
    { name: "testsWritten", label: "Tests written?", type: "select", options: YES_NO },
    { name: "testStatus", label: "Test status", type: "select", options: TEST_STATUS },
    { name: "commitRef", label: "Commit / PR ref", type: "text", placeholder: "PR#21" },
    { name: "promptSpec", label: "Prompt (summarised)", type: "textarea" },
  ];
  return (
    <LogTable<AiLogRow>
      rows={rows}
      canEdit={canEdit}
      fields={fields}
      schema={aiLogSchema}
      createUrl={`/api/teams/${teamId}/logai`}
      rowUrl={(id) => `/api/teams/${teamId}/logai/${id}`}
      emptyValues={() => ({
        date: todayString(),
        module: "",
        feature: "",
        tool: rows.at(-1)?.tool ?? AI_TOOLS[0],
        promptSpec: "",
        linesGenerated: "",
        linesKept: "",
        testsWritten: "no",
        testStatus: "NOT_RUN",
        commitRef: "",
        reviewerMembershipId: rows.at(-1)?.reviewerMembershipId ?? "",
      })}
      toValues={(r) => ({
        date: r.date,
        module: r.module,
        feature: r.feature ?? "",
        tool: r.tool,
        promptSpec: r.promptSpec,
        linesGenerated: r.linesGenerated === null ? "" : String(r.linesGenerated),
        linesKept: r.linesKept === null ? "" : String(r.linesKept),
        testsWritten: r.testsWritten ? "yes" : "no",
        testStatus: r.testStatus ?? "NOT_RUN",
        commitRef: r.commitRef ?? "",
        reviewerMembershipId: r.reviewerMembershipId ?? "",
      })}
      expand={(r) => <Details r={r} />}
      addLabel="Add AI usage entry"
      columns={[
        { key: "code", label: "ID", render: (r) => <span className="font-mono">{r.code}</span> },
        { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
        { key: "week", label: "Wk", render: (r) => r.week },
        { key: "module", label: "File / module", render: (r) => r.module },
        { key: "feature", label: "Feature", render: (r) => <span className="line-clamp-2 max-w-xs">{r.feature ?? "—"}</span> },
        { key: "tool", label: "AI tool", render: (r) => r.tool },
        { key: "gen", label: "Lines gen.", render: (r) => r.linesGenerated ?? "—", className: "text-right" },
        { key: "kept", label: "Lines kept", render: (r) => r.linesKept ?? "—", className: "text-right" },
        { key: "keep", label: "Keep %", render: (r) => pct(keepRate(r.linesGenerated, r.linesKept)), className: "text-right" },
        { key: "reviewer", label: "Reviewer", render: (r) => r.reviewerName ?? "—" },
        { key: "verdict", label: "Verdict", render: (r) => <VerdictBadge r={r} /> },
      ]}
      footer={(visible) => {
        const gen = visible.reduce((s, r) => s + (r.linesGenerated ?? 0), 0);
        const kept = visible.reduce((s, r) => s + (r.linesKept ?? 0), 0);
        return (
          <tr className="font-medium">
            <td colSpan={6} className="px-2 py-2 text-right">
              {visible.length} entries · {visible.filter((r) => isApprovedVerdict(r.verdict)).length} approved
            </td>
            <td className="px-2 py-2 text-right">{gen}</td>
            <td className="px-2 py-2 text-right">{kept}</td>
            <td className="px-2 py-2 text-right">{pct(keepRate(gen, kept))}</td>
            <td colSpan={2} />
          </tr>
        );
      }}
      emptyText="No AI usage recorded yet. Every change where a generator wrote code that reached the repository gets a row: no entry, no merge."
    />
  );
}

/** Entries teammates asked the signed-in member to review: the reviewer gives the verdict. */
export function AiReviewList({ teamId, rows }: { teamId: string; rows: AiLogRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<string>();
  if (rows.length === 0) return <p className="text-sm text-slate-500">No review requests.</p>;
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-md border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-mono">{r.code}</span> · {r.authorName} · {r.module} · {r.feature ?? ""} · {r.date} · {r.linesKept ?? "—"}/
              {r.linesGenerated ?? "—"} lines kept
            </div>
            <div className="flex items-center gap-2">
              <VerdictBadge r={r} />
              <Select
                aria-label={`Verdict for ${r.code} by ${r.authorName}`}
                className="w-auto"
                value={r.verdict}
                disabled={pending === r.id}
                onChange={async (e) => {
                  setPending(r.id);
                  setError(undefined);
                  const res = await sendJson(`/api/teams/${teamId}/logai/${r.id}/review`, "POST", { verdict: e.target.value as AiVerdict });
                  setPending(undefined);
                  if (!res.ok) setError(res.error);
                  router.refresh();
                }}
              >
                {AI_VERDICTS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Details r={r} />
        </div>
      ))}
    </div>
  );
}

