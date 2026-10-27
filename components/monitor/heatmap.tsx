import type { TeamMonitoring } from "@/lib/server/monitoring";

/** Sequential blue ramp (dataviz reference palette); lightest = least. */
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];
const BINS = [2, 4, 6, 8, 10];
function colour(hours: number): { bg: string; fg: string } | null {
  if (hours <= 0) return null;
  const i = BINS.findIndex((b) => hours <= b);
  const idx = i === -1 ? RAMP.length - 1 : i;
  return { bg: RAMP[idx]!, fg: idx >= 3 ? "#ffffff" : "#0b0b0b" };
}

/** Members down the side, weeks across, coloured by LOGT hours; backdated weeks marked. */
export function Heatmap({ m }: { m: TeamMonitoring }) {
  const weeks = m.heatmap[0]?.weeks.map((w) => w.week) ?? [];
  const breaks = m.planning.semester.breakWeeks;
  return (
    <div className="space-y-2">
      <div className="relative -mx-4 overflow-x-auto sm:mx-0">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-1 text-left font-medium text-slate-600">Member</th>
              {weeks.map((w) => (
                <th key={w} className="px-0.5 py-1 font-medium text-slate-600" title={breaks.includes(w) ? "Break week" : undefined}>
                  W{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.heatmap.map((row) => (
              <tr key={row.memberId}>
                <td className="sticky left-0 bg-white px-2 py-0.5 text-sm whitespace-nowrap">{row.name}</td>
                {row.weeks.map((c) => {
                  const col = colour(c.hours);
                  return (
                    <td key={c.week} className="p-0.5">
                      <div
                        className={`relative flex h-9 w-11 items-center justify-center rounded ${col ? "" : "border border-slate-200 bg-white"} ${c.late ? "outline-2 outline-offset-[-2px] outline-dashed outline-amber-600" : ""}`}
                        style={col ? { background: col.bg, color: col.fg } : undefined}
                        title={`${row.name}, week ${c.week}: ${c.hours} h${c.late ? " — mostly typed in after the fact" : ""}; ${c.logd} defects, ${c.logai} AI entries`}
                      >
                        {c.hours > 0 ? c.hours : breaks.includes(c.week) ? "·" : ""}
                        {c.late && <span className="absolute top-0 right-0.5 text-[9px] font-bold text-amber-700">L</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>Hours:</span>
        <span className="inline-block h-4 w-6 rounded border border-slate-200 bg-white" /> 0
        {RAMP.map((c, i) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span className="inline-block h-4 w-6 rounded" style={{ background: c }} />
            {i === 0 ? "≤2" : i === RAMP.length - 1 ? ">10" : `≤${BINS[i]}`}
          </span>
        ))}
        <span className="ml-2 inline-flex items-center gap-1">
          <span className="inline-block h-4 w-6 rounded border border-slate-200 outline-2 outline-offset-[-2px] outline-dashed outline-amber-600" />
          <b className="text-amber-700">L</b> most hours typed {m.thresholds.backfill.lagDays}+ days after the date
        </span>
      </div>
    </div>
  );
}

/** Per member per week: LOGT on time / late / none, defects and AI entries; team row: WEEK report status. */
export function WeeklyCompletion({ m }: { m: TeamMonitoring }) {
  const weeks = m.heatmap[0]?.weeks.map((w) => w.week) ?? [];
  const weekStatus = new Map(m.weekReports.map((w) => [w.week, w.status]));
  const WEEK_MARK: Record<string, string> = { submitted: "✓", late: "L", missing: "✗", open: "…" };
  return (
    <div className="space-y-2">
      <div className="relative -mx-4 overflow-x-auto sm:mx-0">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-1 text-left font-medium text-slate-600" />
              {weeks.map((w) => (
                <th key={w} className="px-1 py-1 font-medium text-slate-600">
                  W{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.heatmap.map((row) => (
              <tr key={row.memberId} className="border-t border-slate-100">
                <td className="sticky left-0 bg-white px-2 py-1 text-sm whitespace-nowrap">{row.name}</td>
                {row.weeks.map((c) => (
                  <td key={c.week} className="px-1 py-1 text-center whitespace-nowrap" title={`LOGT ${c.hours} h, LOGD ${c.logd}, LOGAI ${c.logai}`}>
                    <span className={c.hours === 0 ? "text-slate-300" : c.late ? "font-bold text-amber-700" : "text-green-700"}>{c.hours === 0 ? "—" : c.late ? "L" : "✓"}</span>
                    {(c.logd > 0 || c.logai > 0) && (
                      <span className="block text-[10px] text-slate-500">
                        {c.logd > 0 ? `D${c.logd}` : ""}
                        {c.logai > 0 ? ` A${c.logai}` : ""}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200">
              <td className="sticky left-0 bg-white px-2 py-1 text-sm font-medium whitespace-nowrap">WEEK report</td>
              {weeks.map((w) => {
                const s = weekStatus.get(w);
                return (
                  <td key={w} className={`px-1 py-1 text-center ${s === "missing" ? "font-bold text-red-700" : s === "late" ? "font-bold text-amber-700" : "text-slate-700"}`} title={s ?? "not required"}>
                    {s ? WEEK_MARK[s] : ""}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        LOGT: ✓ logged on time · L mostly typed in later · — nothing. D = defects, A = AI entries that week. WEEK: ✓ submitted · L late · ✗ missing · … not yet due.
      </p>
    </div>
  );
}
