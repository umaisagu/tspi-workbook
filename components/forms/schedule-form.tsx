"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Planning } from "@/lib/server/forms/planning";
import { Alert, Button, sendJson } from "@/components/ui/form";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const h = (v: number) => (Math.round(v * 10) / 10).toString();

/** SCHEDULE: each member's planned hours per week (editable) and the computed team schedule. */
export function ScheduleForm({
  teamId,
  planning,
  editableMemberIds,
}: {
  teamId: string;
  planning: Pick<Planning, "weeks" | "scheduleGrid" | "schedule" | "currentWeek" | "semester">;
  editableMemberIds: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const { weeks, scheduleGrid, schedule, currentWeek, semester } = planning;

  function start(memberId: string) {
    const row = scheduleGrid.find((r) => r.membershipId === memberId)!;
    setDraft(Object.fromEntries(weeks.map((w) => [w, row.hours[w] ? String(row.hours[w]) : ""])));
    setError(undefined);
    setEditing(memberId);
  }

  async function save() {
    if (!editing) return;
    const values = weeks.map((w) => ({ week: w, planHours: draft[w] === "" || draft[w] === undefined ? 0 : Number(draft[w]) }));
    const bad = values.find((v) => Number.isNaN(v.planHours) || v.planHours < 0 || v.planHours > 80);
    if (bad) {
      setError(`Week ${bad.week}: enter hours between 0 and 80.`);
      return;
    }
    setPending(true);
    const r = await sendJson(`/api/teams/${teamId}/schedule`, "PUT", { membershipId: editing, weeks: values });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setEditing(null);
    router.refresh();
  }

  const weekClass = (w: number) => `${w === currentWeek ? "bg-blue-50" : ""} ${semester.breakWeeks.includes(w) ? "text-slate-400" : ""}`;

  return (
    <div className="space-y-6">
      {schedule.difference > 0 && (
        <Alert kind="warning">
          Tasks need {schedule.totalTaskPlanHours} h but only {schedule.totalSchedulePlanHours} h are scheduled: add {h(schedule.difference)} schedule
          hours. {schedule.unscheduledTaskIds.length} task(s) have no plan week.
        </Alert>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Planned hours per member</h3>
        {error && <Alert>{error}</Alert>}
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="sticky left-0 bg-white px-2 py-2 text-left font-medium">Member</th>
                {weeks.map((w) => (
                  <th key={w} className={`px-1 py-2 text-center font-medium ${weekClass(w)}`} title={semester.breakWeeks.includes(w) ? "Break week" : undefined}>
                    W{w}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scheduleGrid.map((row) => {
                const isEditing = editing === row.membershipId;
                const total = weeks.reduce((s, w) => s + (isEditing ? Number(draft[w] || 0) : row.hours[w] ?? 0), 0);
                return (
                  <tr key={row.membershipId} className="border-b border-slate-100">
                    <td className="sticky left-0 bg-white px-2 py-1 whitespace-nowrap">
                      {row.name}
                      {!row.active && <span className="text-xs text-slate-500"> (left)</span>}
                    </td>
                    {weeks.map((w) => (
                      <td key={w} className={`px-1 py-1 text-center ${weekClass(w)}`}>
                        {isEditing ? (
                          <input
                            aria-label={`${row.name} week ${w}`}
                            inputMode="decimal"
                            className="w-12 rounded border border-slate-300 px-1 py-1 text-center"
                            value={draft[w] ?? ""}
                            onChange={(e) => setDraft({ ...draft, [w]: e.target.value })}
                          />
                        ) : (
                          row.hours[w] || ""
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right font-medium">{h(total)}</td>
                    <td className="px-2 py-1 text-right whitespace-nowrap">
                      {isEditing ? (
                        <span className="inline-flex gap-2">
                          <Button onClick={save} disabled={pending}>
                            {pending ? "Saving…" : "Save"}
                          </Button>
                          <Button variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </span>
                      ) : (
                        editableMemberIds.includes(row.membershipId) &&
                        !editing && (
                          <button type="button" className="text-blue-700 hover:underline" onClick={() => start(row.membershipId)}>
                            Edit
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Team schedule (computed)</h3>
        <p className="mb-2 text-xs text-slate-500">
          Task plan hours: {schedule.totalTaskPlanHours} · schedule plan hours: {schedule.totalSchedulePlanHours} · difference: {h(schedule.difference)}
          {schedule.predictedCompletionWeek ? ` · predicted completion: week ${schedule.predictedCompletionWeek}` : ""}
        </p>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-slate-600">
                {["Week", "Plan h", "Cum plan h", "Actual h", "Cum actual h", "PV", "Cum PV", "EV", "Cum EV", "Pred. h", "Cum pred. h", "Pred. EV", "Cum pred. EV"].map((c) => (
                  <th key={c} className="px-2 py-2 font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.weeks.map((w) => (
                <tr key={w.week} className={`border-b border-slate-100 text-right ${weekClass(w.week)}`}>
                  <td className="px-2 py-1">{w.week}</td>
                  <td className="px-2 py-1">{h(w.planHours)}</td>
                  <td className="px-2 py-1">{h(w.cumPlanHours)}</td>
                  <td className="px-2 py-1">{w.week <= currentWeek ? h(w.actualHours) : ""}</td>
                  <td className="px-2 py-1">{w.week <= currentWeek ? h(w.cumActualHours) : ""}</td>
                  <td className="px-2 py-1">{pct(w.plannedValue)}</td>
                  <td className="px-2 py-1">{pct(w.cumPlannedValue)}</td>
                  <td className="px-2 py-1">{w.week <= currentWeek ? pct(w.earnedValue) : ""}</td>
                  <td className="px-2 py-1 font-medium">{w.week <= currentWeek ? pct(w.cumEarnedValue) : ""}</td>
                  <td className="px-2 py-1">{w.predictedHours === null ? "" : h(w.predictedHours)}</td>
                  <td className="px-2 py-1">{w.cumPredictedHours === null ? "" : h(w.cumPredictedHours)}</td>
                  <td className="px-2 py-1">{w.predictedEarnedValue === null ? "" : pct(w.predictedEarnedValue)}</td>
                  <td className="px-2 py-1">{w.cumPredictedEarnedValue === null ? "" : pct(w.cumPredictedEarnedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
