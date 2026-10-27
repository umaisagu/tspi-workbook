"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiLogRow } from "@/lib/server/forms/logs";
import { aiLogSchema } from "@/lib/schemas/forms";
import { Badge } from "@/components/ui/card";
import { Button, sendJson } from "@/components/ui/form";
import { LogTable, type FieldDef, type Option } from "./log-table";
import { none, todayString } from "./options";

function Details({ r }: { r: AiLogRow }) {
  const items: [string, string | null][] = [
    ["Prompt / spec", r.promptSpec],
    ["Output summary", r.outputSummary],
    ["Human refinement", r.humanRefinement],
    ["Test evidence", r.testEvidence],
  ];
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="whitespace-pre-wrap">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ApprovalBadge({ r }: { r: AiLogRow }) {
  if (!r.reviewerMembershipId) return <Badge>No reviewer</Badge>;
  return r.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Awaiting review</Badge>;
}

export function LogaiForm({ teamId, rows, canEdit, teammates }: { teamId: string; rows: AiLogRow[]; canEdit: boolean; teammates: Option[] }) {
  const fields: FieldDef[] = [
    { name: "date", label: "Date", type: "date" },
    { name: "module", label: "Module / requirement ID", type: "text", placeholder: "FR-03 Order Summary", wide: true },
    { name: "tool", label: "Tool", type: "text", placeholder: "Claude, Codex (ChatGPT)…" },
    { name: "model", label: "Model", type: "text", placeholder: "Exact model name and version", wide: true },
    { name: "reviewerMembershipId", label: "Reviewer (teammate)", type: "select", options: [none("Not yet chosen"), ...teammates] },
    { name: "prUrl", label: "Pull request link", type: "url", placeholder: "https://github.com/org/repo/pull/12", wide: true },
    { name: "promptSpec", label: "Prompt / spec (requirement ID, expected behaviour, acceptance criteria, constraints)", type: "textarea" },
    { name: "outputSummary", label: "Output summary", type: "textarea" },
    { name: "humanRefinement", label: "Human refinement (what you changed, corrected or rejected)", type: "textarea" },
    { name: "testEvidence", label: "Test evidence", type: "textarea" },
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
        tool: rows.at(-1)?.tool ?? "",
        model: rows.at(-1)?.model ?? "",
        promptSpec: "",
        outputSummary: "",
        humanRefinement: "",
        testEvidence: "",
        prUrl: "",
        reviewerMembershipId: rows.at(-1)?.reviewerMembershipId ?? "",
      })}
      toValues={(r) => ({
        date: r.date,
        module: r.module,
        tool: r.tool,
        model: r.model,
        promptSpec: r.promptSpec,
        outputSummary: r.outputSummary,
        humanRefinement: r.humanRefinement,
        testEvidence: r.testEvidence,
        prUrl: r.prUrl ?? "",
        reviewerMembershipId: r.reviewerMembershipId ?? "",
      })}
      expand={(r) => <Details r={r} />}
      addLabel="Add AI usage entry"
      columns={[
        { key: "code", label: "ID", render: (r) => <span className="font-mono">{r.code}</span> },
        { key: "date", label: "Date", render: (r) => <span className="whitespace-nowrap">{r.date}</span> },
        { key: "week", label: "Wk", render: (r) => r.week },
        { key: "module", label: "Module", render: (r) => r.module },
        { key: "tool", label: "Tool / model", render: (r) => `${r.tool} · ${r.model}` },
        {
          key: "pr",
          label: "PR",
          render: (r) =>
            r.prUrl ? (
              <a href={r.prUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                #{r.prUrl.split("/").pop()}
              </a>
            ) : (
              "—"
            ),
        },
        { key: "reviewer", label: "Reviewer", render: (r) => r.reviewerName ?? "—" },
        { key: "approved", label: "Approved", render: (r) => <ApprovalBadge r={r} /> },
      ]}
      emptyText="No AI usage recorded yet. Every time AI generates code (from Lab 04), add an entry here."
    />
  );
}

/** Entries teammates asked the signed-in member to review. */
export function AiReviewList({ teamId, rows }: { teamId: string; rows: AiLogRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  if (rows.length === 0) return <p className="text-sm text-slate-500">No review requests.</p>;
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-md border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-mono">{r.code}</span> · {r.authorName} · {r.module} · {r.date}{" "}
              {r.prUrl && (
                <a href={r.prUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                  PR
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ApprovalBadge r={r} />
              <Button
                variant={r.approved ? "secondary" : "primary"}
                onClick={async () => {
                  const res = await sendJson(`/api/teams/${teamId}/logai/${r.id}/review`, "POST", { approved: !r.approved });
                  if (!res.ok) setError(res.error);
                  router.refresh();
                }}
              >
                {r.approved ? "Withdraw approval" : "Approve"}
              </Button>
            </div>
          </div>
          <Details r={r} />
        </div>
      ))}
    </div>
  );
}
