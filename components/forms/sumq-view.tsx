import type { Sumq } from "@/lib/tsp/quality";
import { phaseName } from "@/lib/tsp/phases";
import { Card } from "@/components/ui/card";
import { num, pct } from "./format";
import { PlanActualTable } from "./sump-view";

/** QualGuide goals shown next to actuals. */
const GOALS: Record<string, string> = {
  "% before COMPILE": "> 75%",
  "% before UT": "> 85%",
  "% before IT": "> 97.5%",
  "% before ST": "> 99%",
  "DLD Review / Unit Test": "> 2.0",
  "Code Review / Compile": "> 2.0",
  "REQ Inspection / Requirements": "> 0.25",
  "HLD Inspection / High-Level Design": "> 0.5",
  "Detailed Design / Code": "> 1.00",
  "DLD Review / Detailed Design": "> 0.5",
  "Code Review / Code": "> 0.5",
  "REQ Inspection (pages/h)": "< 2",
  "HLD Inspection (pages/h)": "< 5",
  "DLD Review (lines/h)": "< 100",
  "Code Review (LOC/h)": "< 200",
  COMPILE: "< 10",
  UT: "< 5",
  IT: "< 0.5",
  ST: "< 0.2",
};

type Row = { label: string; plan: number | null; actual: number | null };
const table = (rows: Row[], fmt: (v: number | null) => string) =>
  rows.map((r) => [r.label, fmt(r.plan), fmt(r.actual), <span key="g" className="text-xs text-slate-400">{GOALS[r.label] ?? ""}</span>]);

/** SUMQ: Quality Plan (computed from SUMP; plan inputs on the right). */
export function SumqView({ sumq, isSystem }: { sumq: Sumq; isSystem: boolean }) {
  const head = ["", "Plan", "Actual", "Goal"];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        {isSystem && (
          <Card title="SYSTEM percent defect free (actual)">
            <PlanActualTable head={["Phase", "Actual"]} rows={sumq.percentDefectFree.map((r) => [`In ${phaseName(r.phase)}`, pct(r.actual)])} />
          </Card>
        )}
        <Card title="Defects / page">
          <PlanActualTable head={head} rows={table(sumq.defectsPerPage, (v) => num(v, 2))} />
        </Card>
        <Card title="Defects / KLOC">
          <PlanActualTable head={head} rows={table(sumq.defectsPerKloc, (v) => num(v, 1))} />
        </Card>
        <Card title="Defect ratios">
          <PlanActualTable head={head} rows={table(sumq.defectRatios, (v) => num(v, 2))} />
        </Card>
        <Card title="Development time ratios">
          <PlanActualTable head={head} rows={table(sumq.timeRatios, (v) => num(v, 2))} />
        </Card>
        <Card title="Inspection / review rates">
          <PlanActualTable head={head} rows={table(sumq.reviewRates, (v) => num(v, 1))} />
        </Card>
        <Card title="Appraisal / failure ratio (A/FR)">
          <PlanActualTable head={head} rows={table([{ label: "(DLDR + DLDINSP + CR + CODEINSP) ÷ (COMPILE + UT) time", ...sumq.afr }], (v) => num(v, 2))} />
        </Card>
        <Card title="Process yields">
          <PlanActualTable head={head} rows={table(sumq.processYields, pct)} />
        </Card>
      </div>
      <Card title="Phase yields, injection and removal rates">
        <PlanActualTable
          head={["Phase", "Yield plan", "Yield actual", "Injected/h plan", "Injected/h actual", "Removed/h plan", "Removed/h actual"]}
          rows={sumq.phaseYields.map((y) => {
            const inj = sumq.injectionRates.find((r) => r.phase === y.phase);
            const rem = sumq.removalRates.find((r) => r.phase === y.phase);
            return [phaseName(y.phase), pct(y.plan, 0), pct(y.actual, 0), num(inj?.plan ?? null, 3), num(inj?.actual ?? null, 2), num(rem?.plan ?? null, 2), num(rem?.actual ?? null, 2)];
          })}
        />
      </Card>
      <p className="text-xs text-slate-500">— means the ratio has no denominator yet (e.g. no size or no hours in that phase).</p>
    </div>
  );
}
