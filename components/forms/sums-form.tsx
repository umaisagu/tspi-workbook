"use client";

import type { SumsRow } from "@/lib/server/forms/quality";
import { componentSizeSchema } from "@/lib/schemas/forms";
import { LogTable } from "./log-table";
import { SIZE_MEASURES } from "./task-form";
import { num } from "./format";

const FIELDS = ["Base", "Deleted", "Modified", "Added", "Reused", "NewReuse"] as const;
const LABEL: Record<(typeof FIELDS)[number], string> = { Base: "Base", Deleted: "Deleted", Modified: "Modified", Added: "Added", Reused: "Reused", NewReuse: "New reuse" };
const measureLabel = (m: string) => SIZE_MEASURES.find((o) => o.value === m)?.label ?? m;

/** SUMS: planned and actual sizes per component (entered); N&C and Total computed. */
export function SumsForm({ teamId, rows, canEdit }: { teamId: string; rows: SumsRow[]; canEdit: boolean }) {
  const key = (k: string) => k.charAt(0).toLowerCase() + k.slice(1);
  return (
    <LogTable<SumsRow>
      rows={rows}
      canEdit={canEdit}
      allowAdd={false}
      allowDelete={false}
      updateMethod="PUT"
      editLabel="Edit sizes"
      schema={componentSizeSchema}
      createUrl=""
      rowUrl={(id) => `/api/teams/${teamId}/components/${id}/size`}
      emptyText="No components yet. Add them on the Team page."
      fields={[
        { name: "sizeMeasure", label: "Size measure", type: "select", options: SIZE_MEASURES, wide: true },
        ...FIELDS.map((f) => ({ name: `plan${f}`, label: `Plan ${LABEL[f].toLowerCase()}`, type: "number" as const })),
        ...FIELDS.map((f) => ({ name: `act${f}`, label: `Actual ${LABEL[f].toLowerCase()}`, type: "number" as const })),
      ]}
      emptyValues={() => ({})}
      toValues={(r) => ({
        sizeMeasure: r.sizeMeasure,
        ...Object.fromEntries(FIELDS.map((f) => [`plan${f}`, String(r.plan[key(f) as keyof typeof r.plan])])),
        ...Object.fromEntries(FIELDS.map((f) => [`act${f}`, String(r.actual[key(f) as keyof typeof r.actual])])),
      })}
      columns={[
        {
          key: "name",
          label: "Component",
          render: (r) => (
            <span>
              <span className="font-medium">{r.name}</span>
              {r.parentName && <span className="block text-xs text-slate-500">part of {r.parentName}</span>}
            </span>
          ),
        },
        { key: "owner", label: "Owner", render: (r) => r.ownerName ?? "—" },
        { key: "measure", label: "Measure", render: (r) => measureLabel(r.sizeMeasure) },
        { key: "pb", label: "Plan B/D/M/A/R", render: (r) => `${r.plan.base}/${r.plan.deleted}/${r.plan.modified}/${r.plan.added}/${r.plan.reused}`, className: "text-right whitespace-nowrap" },
        { key: "pn", label: "Plan N&C", render: (r) => r.plan.newAndChanged, className: "text-right" },
        { key: "pt", label: "Plan total", render: (r) => r.plan.total, className: "text-right" },
        { key: "ab", label: "Actual B/D/M/A/R", render: (r) => `${r.actual.base}/${r.actual.deleted}/${r.actual.modified}/${r.actual.added}/${r.actual.reused}`, className: "text-right whitespace-nowrap" },
        { key: "an", label: "Actual N&C", render: (r) => r.actual.newAndChanged, className: "text-right font-medium" },
        { key: "at", label: "Actual total", render: (r) => r.actual.total, className: "text-right font-medium" },
        { key: "h", label: "Plan / actual h", render: (r) => `${num(r.planHours)} / ${num(r.actualHours)}`, className: "text-right whitespace-nowrap" },
        { key: "d", label: "Defects", render: (r) => r.defectsInjected, className: "text-right" },
      ]}
    />
  );
}
