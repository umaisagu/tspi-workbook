import type { QualityRow, Sumq, Verdict } from "@/lib/tsp/quality";
import { phaseName } from "@/lib/tsp/phases";
import { Badge, Card } from "@/components/ui/card";
import { num, pct } from "./format";
import { PlanActualTable } from "./sump-view";

const fmt = (r: QualityRow, v: number | null) => (r.format === "pct" ? pct(v) : r.format === "int" ? num(v, 0) : num(v, 2));
const TONE: Record<Verdict, "green" | "amber" | "red"> = {
  OK: "green",
  LOW: "amber",
  HIGH: "red",
  "TOO FAST": "amber",
  ACTION: "red",
};

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  return verdict ? <Badge tone={TONE[verdict]}>{verdict}</Badge> : <span className="text-slate-300">—</span>;
}

const rowCells = (r: QualityRow) => [
  r.label,
  fmt(r, r.plan),
  fmt(r, r.actual),
  <span key="g" className="whitespace-nowrap text-xs text-slate-500">
    {r.guideline?.text ?? ""}
  </span>,
  <VerdictBadge key="v" verdict={r.verdict} />,
];

/** SUMQ: Quality Summary (Workbook v3.0), computed from SUMP and the logs; guidelines and verdicts as on the sheet. */
export function SumqView({ sumq, isSystem }: { sumq: Sumq; isSystem: boolean }) {
  const head = ["", "Plan", "Actual", "Guideline", "Verdict"];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Quality profile">
          <p className="mb-3 text-xs text-slate-500">Each axis scores 0–100% against its QPROFPARAM target; 100% means the target is met.</p>
          <ul className="space-y-2 text-sm">
            {sumq.profile.map((a) => (
              <li key={a.label}>
                <div className="flex justify-between gap-2">
                  <span>{a.label}</span>
                  <span className="text-slate-600">
                    {num(a.value, 2)} <span className="text-xs text-slate-400">(target {a.target})</span> · {Math.round(a.score * 100)}%
                  </span>
                </div>
                <div
                  className="mt-1 h-2 rounded bg-slate-100"
                  role="meter"
                  aria-label={a.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(a.score * 100)}
                >
                  <div className="h-2 rounded bg-[#2a78d6]" style={{ width: `${Math.round(a.score * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        {isSystem && (
          <Card title="Percent defect free (actual)">
            <PlanActualTable
              head={["Phase", "Parts with no defect found"]}
              rows={sumq.percentDefectFree.map((r) => [`${r.phase} — ${phaseName(r.phase)}`, pct(r.actual)])}
            />
          </Card>
        )}
      </div>
      {sumq.sections.map((s) => (
        <Card key={s.key} title={s.title}>
          <PlanActualTable head={head} rows={s.rows.map(rowCells)} />
        </Card>
      ))}
      <Card title="Defect injection rates (per hour)">
        <PlanActualTable
          head={["Phase", "Plan", "Actual"]}
          rows={sumq.injectionRates.map((r) => [`${r.phase} — ${phaseName(r.phase)}`, num(r.plan, 3), num(r.actual, 2)])}
        />
      </Card>
      <p className="text-xs text-slate-500">
        — means the ratio has no denominator yet (e.g. no size or no hours in that phase). Verdicts compare the actual value with the v3.0 guideline; they are
        prompts for the team&apos;s post-mortem, not marks.
      </p>
    </div>
  );
}
