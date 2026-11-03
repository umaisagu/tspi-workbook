"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Phase } from "@/generated/prisma/enums";
import { DEFAULT_INJECTION_RATES, DEFAULT_PLAN_YIELDS, DEV_PHASES, type PhaseNumbers } from "@/lib/tsp/quality";
import { phaseName } from "@/lib/tsp/phases";
import { Alert, Button, sendJson } from "@/components/ui/form";

const PHASES: Phase[] = [...DEV_PHASES, "UAT"];
const round = (v: number, dp = 3) => String(Math.round(v * 10 ** dp) / 10 ** dp);
const toText = (v: number | null | undefined, scale = 1) => (v === undefined || v === null ? "" : round(v * scale));

interface Column {
  key: string;
  label: string;
  /** Shown value = stored × scale (e.g. 100 for %). */
  scale: number;
  suffix?: string;
  values: PhaseNumbers;
  /** Shown greyed in the cell when nothing is typed (computed value or guideline). */
  fallback?: PhaseNumbers;
  phases: readonly Phase[];
  max?: number;
}

function PhaseGrid({
  teamId,
  part,
  columns,
  canEdit,
  extra,
  saveLabel,
  resetLabel,
  guideline,
}: {
  teamId: string;
  part: "rates" | "defects";
  columns: Column[];
  canEdit: boolean;
  extra?: {
    key: string;
    label: string;
    value: number | null;
    scale: number;
    suffix: string;
    max: number;
  };
  saveLabel: string;
  resetLabel: string;
  guideline?: (p: Phase) => string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const id = (c: Column, p: Phase) => `${c.key}:${p}`;

  function start() {
    const d: Record<string, string> = {};
    for (const c of columns) for (const p of c.phases) d[id(c, p)] = toText(c.values[p], c.scale);
    if (extra) d[extra.key] = toText(extra.value, extra.scale);
    setDraft(d);
    setError(undefined);
    setEditing(true);
  }

  async function save(reset = false) {
    const parse = (text: string | undefined, scale: number, max: number | undefined, label: string) => {
      if (text === undefined || text.trim() === "") return null;
      const n = Number(text);
      if (Number.isNaN(n) || n < 0 || (max !== undefined && n > max))
        throw new Error(`${label}: enter a number from 0${max !== undefined ? ` to ${max}` : ""}.`);
      return n / scale;
    };
    let body: Record<string, unknown>;
    try {
      const rows = PHASES.map((p) => ({
        phase: p,
        ...Object.fromEntries(
          columns.map((c) => [c.key, c.phases.includes(p) ? parse(draft[id(c, p)], c.scale, c.max, `${p} ${c.label.toLowerCase()}`) : null]),
        ),
      }));
      body = {
        part,
        rows,
        ...(extra
          ? {
              [extra.key]: parse(draft[extra.key], extra.scale, extra.max, extra.label),
            }
          : {}),
      };
    } catch (e) {
      if (!reset) return setError((e as Error).message);
      body = {};
    }
    setPending(true);
    const r = await sendJson(`/api/teams/${teamId}/quality-plan`, "PUT", reset ? { part, reset: true } : body);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setEditing(false);
    router.refresh();
  }

  const input = (key: string, label: string, width = "w-20") => (
    <input
      aria-label={label}
      inputMode="decimal"
      className={`${width} rounded border border-slate-300 px-1 py-1 text-right`}
      value={draft[key] ?? ""}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
    />
  );

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {extra && (
        <p className="text-sm">
          <span className="mr-2 font-medium">{extra.label}:</span>
          {editing ? (
            <span className="inline-flex items-center gap-1">
              {input(extra.key, extra.label)}
              {extra.suffix}
            </span>
          ) : extra.value === null ? (
            "—"
          ) : (
            `${toText(extra.value, extra.scale)}${extra.suffix}`
          )}
        </p>
      )}
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 text-left font-medium">Phase</th>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
              {guideline && <th className="px-2 py-2 text-right font-medium text-slate-400">Guideline</th>}
            </tr>
          </thead>
          <tbody>
            {PHASES.map((p) => (
              <tr key={p} className="border-b border-slate-100">
                <td className="px-2 py-1">
                  {p} — {phaseName(p)}
                </td>
                {columns.map((c) => {
                  if (!c.phases.includes(p)) return <td key={c.key} />;
                  const typed = c.values[p];
                  return (
                    <td key={c.key} className="px-2 py-1 text-right">
                      {editing ? (
                        <span className="inline-flex items-center gap-1">
                          {input(id(c, p), `${p} ${c.label}`)}
                          {c.suffix}
                        </span>
                      ) : typed !== undefined ? (
                        `${toText(typed, c.scale)}${c.suffix ?? ""}`
                      ) : c.fallback?.[p] !== undefined ? (
                        <span className="text-slate-400" title="Computed (not typed)">
                          {round(c.fallback[p]! * c.scale, 1)}
                          {c.suffix ?? ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
                {guideline && <td className="px-2 py-1 text-right text-xs text-slate-400">{guideline(p)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit &&
        (editing ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save()} disabled={pending}>
              {pending ? "Saving…" : saveLabel}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={pending}>
              {resetLabel}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={start}>
            Edit
          </Button>
        ))}
    </div>
  );
}

/** SUMQ plan inputs (Team Leader, Quality & Test Manager): defects injected per hour and yield per phase, and CI coverage. */
export function QualityPlanEditor({
  teamId,
  rates,
  yields,
  coverage,
  usingDefaults,
  canEdit,
}: {
  teamId: string;
  rates: PhaseNumbers;
  yields: PhaseNumbers;
  coverage: number | null;
  usingDefaults: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-3">
      {usingDefaults && (
        <Alert kind="info">Using the workbook&apos;s planning guidelines (PLANGUIDE / QUALGUIDE). Edit them to set your team&apos;s quality plan.</Alert>
      )}
      <PhaseGrid
        teamId={teamId}
        part="rates"
        canEdit={canEdit}
        saveLabel="Save quality plan"
        resetLabel="Reset to guidelines"
        extra={{
          key: "coverage",
          label: "Code coverage reported by CI",
          value: coverage,
          scale: 100,
          suffix: "%",
          max: 100,
        }}
        columns={[
          {
            key: "planInjectionRate",
            label: "Defects injected / hour",
            scale: 1,
            values: rates,
            phases: DEV_PHASES,
            max: 100,
          },
          {
            key: "planYield",
            label: "Phase yield",
            scale: 100,
            suffix: "%",
            values: yields,
            phases: PHASES,
            max: 100,
          },
        ]}
        guideline={(p) =>
          [
            DEFAULT_INJECTION_RATES[p] !== undefined ? `${DEFAULT_INJECTION_RATES[p]}/h` : "",
            DEFAULT_PLAN_YIELDS[p] !== undefined ? `${Math.round(DEFAULT_PLAN_YIELDS[p]! * 100)}%` : "",
          ]
            .filter(Boolean)
            .join(" · ")
        }
      />
    </div>
  );
}

/**
 * SUMP planned defects (Team Leader, Planning Manager): typed values replace the computed ones phase by phase; empty cells
 * stay computed (shown grey).
 */
export function PlannedDefectsEditor({
  teamId,
  typed,
  computed,
  canEdit,
}: {
  teamId: string;
  typed: { injected: PhaseNumbers; removed: PhaseNumbers };
  computed: { injected: PhaseNumbers; removed: PhaseNumbers };
  canEdit: boolean;
}) {
  return (
    <PhaseGrid
      teamId={teamId}
      part="defects"
      canEdit={canEdit}
      saveLabel="Save planned defects"
      resetLabel="Use computed values"
      columns={[
        {
          key: "plannedInjected",
          label: "Planned injected",
          scale: 1,
          values: typed.injected,
          fallback: computed.injected,
          phases: DEV_PHASES,
        },
        {
          key: "plannedRemoved",
          label: "Planned removed",
          scale: 1,
          values: typed.removed,
          fallback: computed.removed,
          phases: PHASES,
        },
      ]}
    />
  );
}
