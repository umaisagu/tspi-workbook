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

/** SUMP: Plan Summary (computed). */
export function SumpView({ sump }: { sump: Sump }) {
  const { plan, actual } = sump.size;
  const sizeRows: [string, number, number][] = [
    ["Total requirements pages (SRS)", plan.reqPages, actual.reqPages],
    ["Total HLD pages (SDS)", plan.hldPages, actual.hldPages],
    ["Total detailed design lines", plan.dldLines, actual.dldLines],
    ["Base LOC (B)", plan.loc.base, actual.loc.base],
    ["Deleted LOC (D)", plan.loc.deleted, actual.loc.deleted],
    ["Modified LOC (M)", plan.loc.modified, actual.loc.modified],
    ["Added LOC (A)", plan.loc.added, actual.loc.added],
    ["Reused LOC (R)", plan.loc.reused, actual.loc.reused],
    ["New and changed LOC (N)", plan.loc.newAndChanged, actual.loc.newAndChanged],
    ["Total LOC (T)", plan.loc.total, actual.loc.total],
    ["Total new reuse LOC", plan.loc.newReuse, actual.loc.newReuse],
  ];
  const label = (p: string) => `${phaseName(p as Parameters<typeof phaseName>[0])}`;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Program size">
          <PlanActualTable head={["", "Plan", "Actual"]} rows={sizeRows.map(([l, p, a]) => [l, p, a])} />
        </Card>
        <Card title="Summary">
          <PlanActualTable
            head={["", "Plan", "Actual"]}
            rows={[
              ["LOC / hour (N&C ÷ total hours)", num(sump.summary.locPerHour.plan, 2), num(sump.summary.locPerHour.actual, 2)],
              ["CPI (plan ÷ actual hours)", "", num(sump.summary.cpi.actual, 2)],
              ["% Reuse (R ÷ T)", pct(sump.summary.reusePct.plan), pct(sump.summary.reusePct.actual)],
              ["% New reuse (new reuse ÷ N)", pct(sump.summary.newReusePct.plan), pct(sump.summary.newReusePct.actual)],
            ]}
          />
        </Card>
      </div>
      <Card title="Time in phase (hours)">
        <PlanActualTable
          head={["Phase", "Plan", "Actual", "Actual %"]}
          rows={sump.time.map((r) => [label(r.phase), num(r.plan), num(r.actual), pct(r.actualPct)])}
          total={["Total", num(sump.timeTotal.plan), num(sump.timeTotal.actual), sump.timeTotal.actual ? "100.0%" : "—"]}
        />
      </Card>
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Defects injected">
          <PlanActualTable
            head={["Phase", "Plan", "Actual", "Actual %"]}
            rows={sump.injected.map((r) => [label(r.phase), num(r.plan), r.actual, pct(r.actualPct)])}
            total={["Total development", num(sump.injectedTotal.plan), sump.injectedTotal.actual, ""]}
          />
        </Card>
        <Card title="Defects removed">
          <PlanActualTable
            head={["Phase", "Plan", "Actual", "Actual %"]}
            rows={[
              ...sump.removed.map((r) => [label(r.phase), num(r.plan), r.actual, pct(r.actualPct)]),
            ]}
            total={["Total development", num(sump.removedTotal.plan), sump.removedTotal.actual, ""]}
          />
          <PlanActualTable
            head={["After development", "Plan", "Actual"]}
            rows={[
              ["Acceptance Test", num(sump.acceptanceTest.plan), sump.acceptanceTest.actual],
              ["Product Life", num(sump.productLife.plan), sump.productLife.actual],
            ]}
          />
        </Card>
      </div>
      <p className="text-xs text-slate-500">
        Plan time comes from TASK, actual time from LOGT, actual defects from LOGD, sizes from SUMS. Planned defects use the SUMQ plan injection rates and yields.
      </p>
    </div>
  );
}
