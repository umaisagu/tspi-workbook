"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Phase } from "@/generated/prisma/enums";
import { DEFAULT_INJECTION_RATES, DEFAULT_PLAN_YIELDS, DEV_PHASES, type PhaseNumbers } from "@/lib/tsp/quality";
import { phaseName } from "@/lib/tsp/phases";
import { Alert, Button, sendJson } from "@/components/ui/form";

const PHASES: Phase[] = [...DEV_PHASES, "AT"];
const toText = (v: number | undefined, scale = 1) => (v === undefined ? "" : String(Math.round(v * scale * 1000) / 1000));

/** SUMQ plan inputs: planned defects injected per hour and planned yield (%) per phase. */
export function QualityPlanEditor({
  teamId,
  rates,
  yields,
  usingDefaults,
  canEdit,
}: {
  teamId: string;
  rates: PhaseNumbers;
  yields: PhaseNumbers;
  usingDefaults: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, { rate: string; yield: string }>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  function start() {
    setDraft(Object.fromEntries(PHASES.map((p) => [p, { rate: toText(rates[p]), yield: toText(yields[p], 100) }])));
    setError(undefined);
    setEditing(true);
  }

  async function save(reset = false) {
    const rows = PHASES.map((p) => ({
      phase: p,
      planInjectionRate: draft[p]?.rate === "" ? null : Number(draft[p]?.rate),
      planYield: draft[p]?.yield === "" ? null : Number(draft[p]?.yield) / 100,
    }));
    const bad = rows.find((r) => (r.planInjectionRate !== null && (Number.isNaN(r.planInjectionRate) || r.planInjectionRate < 0)) || (r.planYield !== null && (Number.isNaN(r.planYield) || r.planYield < 0 || r.planYield > 1)));
    if (!reset && bad) return setError(`${bad.phase}: injection rate must be 0 or more, yield between 0 and 100%.`);
    setPending(true);
    const r = await sendJson(`/api/teams/${teamId}/quality-plan`, "PUT", reset ? { reset: true } : { rows });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {usingDefaults && <Alert kind="info">Using the workbook&apos;s planning guidelines (QualGuide). Edit them to set your team&apos;s quality plan.</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 text-left font-medium">Phase</th>
              <th className="px-2 py-2 text-right font-medium">Defects injected / hour</th>
              <th className="px-2 py-2 text-right font-medium">Phase yield</th>
              <th className="px-2 py-2 text-right font-medium text-slate-400">Guideline</th>
            </tr>
          </thead>
          <tbody>
            {PHASES.map((p) => (
              <tr key={p} className="border-b border-slate-100">
                <td className="px-2 py-1">{phaseName(p)}</td>
                <td className="px-2 py-1 text-right">
                  {editing ? (
                    p === "AT" ? (
                      ""
                    ) : (
                      <input
                        aria-label={`${p} injection rate`}
                        inputMode="decimal"
                        className="w-20 rounded border border-slate-300 px-1 py-1 text-right"
                        value={draft[p]?.rate ?? ""}
                        onChange={(e) => setDraft({ ...draft, [p]: { rate: e.target.value, yield: draft[p]?.yield ?? "" } })}
                      />
                    )
                  ) : (
                    toText(rates[p]) || "—"
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {editing ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        aria-label={`${p} yield percent`}
                        inputMode="decimal"
                        className="w-16 rounded border border-slate-300 px-1 py-1 text-right"
                        value={draft[p]?.yield ?? ""}
                        onChange={(e) => setDraft({ ...draft, [p]: { rate: draft[p]?.rate ?? "", yield: e.target.value } })}
                      />
                      %
                    </span>
                  ) : yields[p] === undefined ? (
                    "—"
                  ) : (
                    `${toText(yields[p], 100)}%`
                  )}
                </td>
                <td className="px-2 py-1 text-right text-xs text-slate-400">
                  {[DEFAULT_INJECTION_RATES[p] !== undefined ? `${DEFAULT_INJECTION_RATES[p]}/h` : "", DEFAULT_PLAN_YIELDS[p] !== undefined ? `${Math.round(DEFAULT_PLAN_YIELDS[p]! * 100)}%` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit &&
        (editing ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save()} disabled={pending}>
              {pending ? "Saving…" : "Save quality plan"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={pending}>
              Reset to guidelines
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={start}>
            Edit quality plan
          </Button>
        ))}
    </div>
  );
}
