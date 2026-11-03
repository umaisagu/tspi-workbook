import type { PersonalSummary } from "@/lib/server/forms/personal";
import { phaseName } from "@/lib/tsp/phases";
import { Card } from "@/components/ui/card";
import { num, pct } from "./format";
import { MySizeEditor } from "./my-summary";
import { PlanActualTable } from "./sump-view";
import { VerdictBadge } from "./sumq-view";

const fmt = (format: string | undefined, v: number | null) => (format === "pct" ? pct(v) : format === "int" ? num(v, 0) : num(v, 2));

/** Member workbook MYSUMP + MYSUMQ for one member (computed from their own records; size contribution typed). */
export function MySummaryView({ teamId, data, canEdit }: { teamId: string; data: PersonalSummary; canEdit: boolean }) {
  const { sump, sumq } = data;
  const label = (p: Parameters<typeof phaseName>[0]) => `${p} — ${phaseName(p)}`;
  return (
    <div className="space-y-5">
      <Card title="My measures (MYSUMQ)">
        <p className="mb-3 text-xs text-slate-500">Your own review discipline. These are the numbers the Quality &amp; Test Manager will ask you about.</p>
        <PlanActualTable
          head={["Measure", "Actual", "Guideline", "Verdict", "Reading"]}
          rows={sumq.map((r) => [
            r.label,
            fmt(r.format, r.actual),
            <span key="g" className="whitespace-nowrap text-xs text-slate-500">
              {r.guideline?.text ?? ""}
            </span>,
            <VerdictBadge key="v" verdict={r.verdict} />,
            <span key="r" className="block min-w-48 text-left text-xs text-slate-500">
              {r.reading ?? ""}
            </span>,
          ])}
        />
      </Card>
      <Card title="My size contribution (MYSUMP)">
        <MySizeEditor teamId={teamId} rows={sump.size} canEdit={canEdit} />
      </Card>
      <Card title="Time in phase (hours)">
        <PlanActualTable
          head={["Phase", "Plan", "Actual", "Actual %"]}
          rows={sump.time.filter((r) => r.plan || r.actual).map((r) => [label(r.phase), num(r.plan), num(r.actual), pct(r.actualPct)])}
          total={["Total", num(sump.timeTotal.plan), num(sump.timeTotal.actual), sump.timeTotal.actual ? "100.0%" : "—"]}
        />
        <p className="mt-2 text-xs text-slate-500">Plan = plan hours of the tasks assigned to you (TASK); actual = your LOGT. Phases with no hours are hidden.</p>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Defects injected">
          <PlanActualTable
            head={["Phase", "Actual", "Actual %"]}
            rows={sump.injected.filter((r) => r.actual).map((r) => [label(r.phase), r.actual, pct(r.actualPct)])}
            total={["Total injected", sump.injectedTotal, ""]}
          />
        </Card>
        <Card title="Defects removed">
          <PlanActualTable
            head={["Phase", "Actual", "Actual %"]}
            rows={sump.removed.filter((r) => r.actual).map((r) => [label(r.phase), r.actual, pct(r.actualPct)])}
            total={["Total removed", sump.removedTotal, ""]}
          />
        </Card>
      </div>
    </div>
  );
}
