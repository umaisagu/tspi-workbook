"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { WeekReport, PlanActualPair } from "@/lib/tsp/week";
import { roleLabel } from "@/lib/tsp/roles";
import type { TspiRole } from "@/generated/prisma/enums";
import { Alert, Button, Field, sendJson } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { num, pct } from "./format";

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });
const textareaClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm disabled:bg-slate-50 sm:text-sm";

export interface WeekListItem {
  week: number;
  dueAt: string;
  submittedAt: string | null;
  status: string;
}

export function WeekForm({
  teamId,
  list,
  week,
  report,
  live,
  canEdit,
}: {
  teamId: string;
  list: WeekListItem[];
  week: number | null;
  report: { tasksCompleted: string | null; risksIssues: string | null; nextWeekPlan: string | null; submittedAt: string | null; snapshot: WeekReport | null } | null;
  live: WeekReport | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState({
    tasksCompleted: report?.tasksCompleted ?? "",
    risksIssues: report?.risksIssues ?? "",
    nextWeekPlan: report?.nextWeekPlan ?? "",
  });
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [pending, setPending] = useState(false);

  if (week === null || !live) return <Alert kind="info">Weekly status reports start in Week 5.</Alert>;
  const figures = report?.snapshot ?? live;
  const current = list.find((l) => l.week === week);

  async function save(submit: boolean) {
    if (submit && !text.risksIssues.trim() && !text.nextWeekPlan.trim()) {
      setError("Fill in risks and issues and next week's plan before submitting.");
      return;
    }
    setPending(true);
    setError(undefined);
    const r = await sendJson(`/api/teams/${teamId}/week/${week}`, "PUT", { ...text, submit });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setSaved(submit ? "Submitted." : "Draft saved.");
    router.refresh();
  }

  const row = (label: string, p: PlanActualPair, fmt: (v: number) => string) => (
    <tr className="border-b border-slate-100">
      <td className="px-2 py-1">{label}</td>
      <td className="px-2 py-1 text-right">{fmt(p.plan)}</td>
      <td className="px-2 py-1 text-right">{fmt(p.actual)}</td>
      <td className="px-2 py-1 text-right">{num(p.ratio, 2)}</td>
    </tr>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {list.map((l) => (
          <Link
            key={l.week}
            href={`${pathname}?week=${l.week}`}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${l.week === week ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
          >
            Week {l.week} <StatusBadge status={l.status} />
          </Link>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Due {current && dateFmt.format(new Date(current.dueAt))} (before the next lab).{" "}
        {report?.submittedAt ? `Submitted ${dateFmt.format(new Date(report.submittedAt))}; figures below are as submitted.` : "Figures below are live until you submit."}
      </p>

      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title={`Weekly data — week ${week}`}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 text-left font-medium" />
                  <th className="px-2 py-2 text-right font-medium">Plan</th>
                  <th className="px-2 py-2 text-right font-medium">Actual</th>
                  <th className="px-2 py-2 text-right font-medium">Plan/Actual</th>
                </tr>
              </thead>
              <tbody>
                {row("Schedule hours for this week", figures.scheduleHours.thisWeek, (v) => num(v))}
                {row("Schedule hours this cycle to date", figures.scheduleHours.toDate, (v) => num(v))}
                {row("Earned value for this week", figures.earnedValue.thisWeek, (v) => pct(v))}
                {row("Earned value this cycle to date", figures.earnedValue.toDate, (v) => pct(v))}
                {row("To-date hours for tasks completed", figures.completedTaskHours, (v) => num(v))}
                {row("To-date average hours per week", figures.averageHoursPerWeek, (v) => num(v))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Team member data this week">
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  {["Member", "Plan h", "Actual h", "PV", "EV"].map((h, i) => (
                    <th key={h} className={`px-2 py-2 font-medium ${i ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {figures.members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-2 py-1">
                      {m.name}
                      <span className="block text-xs text-slate-500">{m.roles.map((r) => roleLabel(r as TspiRole)).join(", ")}</span>
                    </td>
                    <td className="px-2 py-1 text-right">{num(m.planHours)}</td>
                    <td className="px-2 py-1 text-right">{num(m.actualHours)}</td>
                    <td className="px-2 py-1 text-right">{pct(m.plannedValue)}</td>
                    <td className="px-2 py-1 text-right">{pct(m.earnedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Development tasks completed or due">
        <ul className="space-y-1 text-sm">
          {figures.tasksCompleted.map((t) => (
            <li key={t.id}>
              ✓ {t.name} <span className="text-slate-500">({t.phase}) · plan {num(t.planHours)} h, actual {num(t.actualHours)} h · EV {pct(t.planValue)}</span>
            </li>
          ))}
          {figures.tasksDue.map((t) => (
            <li key={t.id} className="text-amber-800">
              ○ {t.name} <span className="text-slate-500">({t.phase}) · planned week {t.planWeek} · not completed</span>
            </li>
          ))}
          {figures.tasksCompleted.length + figures.tasksDue.length === 0 && <li className="text-slate-500">No tasks completed or due this week.</li>}
        </ul>
      </Card>

      <Card title="Report">
        <div className="space-y-3">
          {error && <Alert>{error}</Alert>}
          {saved && <Alert kind="success">{saved}</Alert>}
          {(
            [
              ["tasksCompleted", "Tasks completed (notes)", "Highlights of what was finished this week"],
              ["risksIssues", "Risks and issues", "What could stop the team, and what you are doing about it"],
              ["nextWeekPlan", "Next week's plan", "Tasks, owners and meetings for next week"],
            ] as const
          ).map(([k, label, hint]) => (
            <Field key={k} label={label}>
              <textarea rows={4} disabled={!canEdit} className={textareaClass} placeholder={hint} value={text[k]} onChange={(e) => setText({ ...text, [k]: e.target.value })} />
            </Field>
          ))}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save(true)} disabled={pending}>
                {report?.submittedAt ? "Update submitted report" : "Submit report"}
              </Button>
              {!report?.submittedAt && (
                <Button variant="secondary" onClick={() => save(false)} disabled={pending}>
                  Save draft
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
