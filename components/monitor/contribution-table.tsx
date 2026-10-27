import type { TeamMonitoring } from "@/lib/server/monitoring";
import { FLAG_LABELS } from "@/lib/monitoring/flags";
import { Badge } from "@/components/ui/card";
import { num } from "@/components/forms/format";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

/** One row per member: value and share of the team total for each measure; low shares marked. */
export function ContributionTable({ m }: { m: TeamMonitoring }) {
  const low = m.thresholds.lowShare.fraction * m.fairShare;
  const cell = (value: string, share: number | null) => {
    const isLow = share !== null && share < low;
    return (
      <td className={`px-2 py-2 text-right whitespace-nowrap ${isLow ? "bg-amber-50 font-medium text-amber-900" : ""}`}>
        {value} <span className="text-xs text-slate-500">({pct(share)})</span>
        {isLow && <span className="sr-only"> below the low-share threshold</span>}
        {isLow && (
          <span aria-hidden className="ml-1 text-xs">
            ▼
          </span>
        )}
      </td>
    );
  };
  const ghShare = (mine: number, total: number) => (total > 0 ? mine / total : null);
  return (
    <div className="space-y-2">
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 text-left font-medium">Member</th>
              <th className="px-2 py-2 text-right font-medium">Hours</th>
              <th className="px-2 py-2 text-right font-medium">Hours, last 3 wks</th>
              <th className="px-2 py-2 text-right font-medium">Tasks done</th>
              <th className="px-2 py-2 text-right font-medium">Earned value</th>
              <th className="px-2 py-2 text-right font-medium">Defects (fix min)</th>
              <th className="px-2 py-2 text-right font-medium">AI entries</th>
              <th className="px-2 py-2 text-right font-medium">AI reviews for others</th>
              <th className="px-2 py-2 text-right font-medium">Tests written</th>
              {m.githubEnabled && (
                <>
                  <th className="px-2 py-2 text-right font-medium">Commits</th>
                  <th className="px-2 py-2 text-right font-medium">PRs</th>
                  <th className="px-2 py-2 text-right font-medium">Reviews</th>
                </>
              )}
              {m.lecturer && <th className="px-2 py-2 text-right font-medium">PEER received / self</th>}
            </tr>
          </thead>
          <tbody>
            {m.contribution.map((c) => (
              <tr key={c.memberId} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.flags.map((f) => (
                      <Badge key={f} tone="amber">
                        ⚑ {FLAG_LABELS[f]}
                      </Badge>
                    ))}
                  </div>
                </td>
                {cell(`${num(c.values.hours)} h`, c.shares.hours)}
                {cell(`${num(c.values.recentHours)} h`, c.shares.recentHours)}
                {cell(String(c.values.tasksCompleted), c.shares.tasksCompleted)}
                {cell(`${num(c.values.earnedValue)}%`, c.shares.earnedValue)}
                {cell(`${c.values.defects} (${c.defectFixMinutes})`, c.shares.defects)}
                {cell(String(c.values.aiEntries), c.shares.aiEntries)}
                {cell(String(c.values.aiReviews), c.shares.aiReviews)}
                {cell(String(c.values.tests), c.shares.tests)}
                {m.githubEnabled && c.github && m.totals.github && (
                  <>
                    {cell(String(c.github.commits), ghShare(c.github.commits, m.totals.github.commits))}
                    {cell(String(c.github.pullRequests), ghShare(c.github.pullRequests, m.totals.github.pullRequests))}
                    {cell(String(c.github.reviews), ghShare(c.github.reviews, m.totals.github.reviews))}
                  </>
                )}
                {m.lecturer && c.peer && (
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {c.peer.receivedAverage === null ? "—" : `${num(c.peer.receivedAverage)}/50`} / {c.peer.self === null ? "—" : `${c.peer.self}/50`}
                    {c.peer.milestone && <span className="block text-xs text-slate-500">{c.peer.milestone}, {c.peer.ratings} ratings</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        (Share of the team total.) Fair share in a team of {m.members.length}: {pct(m.fairShare)}; ▼ marks a share below {pct(low)} (
        {Math.round(m.thresholds.lowShare.fraction * 100)}% of fair share).{" "}
        {m.githubEnabled ? "GitHub counts come from the team repository, matched by the usernames on FORM-SI." : "GitHub is not connected, so its columns are hidden."}
      </p>
    </div>
  );
}
