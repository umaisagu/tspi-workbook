import type { ReactNode } from "react";
import type { Sump } from "@/lib/tsp/quality";
import { phaseName } from "@/lib/tsp/phases";
import { Card } from "@/components/ui/card";
import { num, pct } from "./format";

export function PlanActualTable({ head, rows, total }: { head: string[]; rows: ReactNode[][]; total?: ReactNode[] }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600">
            {head.map((h, i) => (
              <th key={h} className={`px-2 py-2 font-medium ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              {r.map((c, j) => (
                <td key={j} className={`px-2 py-1 ${j === 0 ? "" : "text-right"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {total && (
            <tr className="font-semibold">
              {total.map((c, j) => (
                <td key={j} className={`px-2 py-1 ${j === 0 ? "" : "text-right"}`}>
                  {c}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** SUMP: Plan Summary (Workbook v3.0). Plan time from TASK, planned defects computed (or typed on SUMQ), actuals from the logs. */
export function SumpView({ sump }: { sump: Sump }) {
  const z = sump.size;
  const sizeRows: [string, { plan: number; actual: number }][] = [
    ["Total requirements pages (SRS)", z.srsPages],
    ["Total design pages (SDD)", z.sddPages],
    ["New & changed Dart LOC (N)", z.newAndChanged],
    ["Total Dart LOC (T)", z.total],
    ["Reused Dart LOC (R)", z.reused],
    ["Screens delivered", z.screens],
    ["Reusable widgets built", z.widgets],
  ];
  const label = (p: Parameters<typeof phaseName>[0]) => `${p} — ${phaseName(p)}`;
  const s = sump.summary;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Program size">
          <PlanActualTable head={["", "Plan", "Actual"]} rows={sizeRows.map(([l, v]) => [l, num(v.plan, 0), num(v.actual, 0)])} />
        </Card>
        <Card title="Summary measures">
          <PlanActualTable
            head={["", "Plan", "Actual"]}
            rows={[
              ["LOC per hour", num(s.locPerHour.plan, 2), num(s.locPerHour.actual, 2)],
              ["Cost performance index (CPI)", "", num(s.cpi.actual, 2)],
              ["Defects per KLOC (development)", num(s.defectsPerKloc.plan, 1), num(s.defectsPerKloc.actual, 1)],
              ["Hours per defect removed", num(s.hoursPerDefect.plan, 2), num(s.hoursPerDefect.actual, 2)],
              ["% of code that is AI-assisted", "", pct(s.aiShare.actual)],
              ["Defects traced to AI-generated code", "", s.defectsFromAi ?? "—"],
              ["Client acceptance defects", "", s.acceptanceDefects],
            ]}
          />
        </Card>
      </div>
      <Card title="Time in phase (hours)">
        <PlanActualTable
          head={["Phase", "Plan", "Actual", "Actual %", "Plan %"]}
          rows={sump.time.map((r) => [label(r.phase), num(r.plan), num(r.actual), pct(r.actualPct), pct(r.planPct)])}
          total={["Total", num(sump.timeTotal.plan), num(sump.timeTotal.actual), sump.timeTotal.actual ? "100.0%" : "—", sump.timeTotal.plan ? "100.0%" : "—"]}
        />
      </Card>
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Defects injected">
          <PlanActualTable
            head={["Phase", "Plan", "Actual", "Actual %"]}
            rows={[...sump.injected.map((r) => [label(r.phase), num(r.plan), r.actual, pct(r.actualPct)])]}
            total={["Total development", num(sump.injectedTotal.plan), sump.injectedTotal.actual, ""]}
          />
          <PlanActualTable
            head={["After development", "Plan", "Actual"]}
            rows={[
              ["UAT — injected in client acceptance test", "", sump.injectedLater.uat],
              ["PL — injected after release", "", sump.injectedLater.pl],
            ]}
          />
        </Card>
        <Card title="Defects removed">
          <PlanActualTable
            head={["Phase", "Plan", "Actual", "Actual %"]}
            rows={sump.removed.map((r) => [label(r.phase), num(r.plan), r.actual, pct(r.actualPct)])}
            total={["Total development", num(sump.removedTotal.plan), sump.removedTotal.actual, ""]}
          />
          <PlanActualTable
            head={["After development", "Plan", "Actual"]}
            rows={[
              ["UAT — removed in client acceptance test", num(sump.removedLater.uat.plan), sump.removedLater.uat.actual],
              ["PL — removed after release", num(sump.removedLater.pl.plan), sump.removedLater.pl.actual],
            ]}
          />
        </Card>
      </div>
      <p className="text-xs text-slate-500">
        Plan time comes from TASK, actual time from LOGT, actual defects from LOGD, sizes from SUMS, AI lines from LOGAI. Planned defects are computed from the
        SUMQ plan (injection rate × plan hours, then each phase&apos;s yield of the defects present) unless typed there.
      </p>
    </div>
  );
}
